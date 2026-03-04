import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 캐싱 완전 방지
// 캐싱 완전 방지
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

function getKoreaDateString(): string {
    return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
}

// 초기화 데이터 (에러 시 반환용)
const fallbackData = {
    today: { count: 0, members: [] },
    ranking: [],
    totalCompletions: 0
};

export async function GET(req: NextRequest) {
    console.log("[Stats API] GET Request Started");
    try {
        const { searchParams } = new URL(req.url);
        const churchId = searchParams.get('church_id') || 'jesus-in';
        const today = getKoreaDateString();
        const firstOfMonth = today.slice(0, 7) + '-01';

        // church_id가 문자열 'undefined'나 'null'로 넘어오는 경우를 대비
        const cid = (churchId === 'undefined' || churchId === 'null' || !churchId) ? 'jesus-in' : churchId;

        console.log(`[Stats API] Target Date: ${today}, Church: ${cid}`);

        // 1. 오늘 참여자 조회
        const todayPromise = supabaseAdmin
            .from('qt_completions')
            .select('user_id, user_name, avatar_url')
            .eq('completed_date', today)
            .eq('church_id', cid)
            .order('created_at', { ascending: true });

        // 2. 이번 달 랭킹 조회
        // lte(today) 대신 오늘 날짜의 23:59:59를 포함하도록 하거나, 
        // 단순히 gte(firstOfMonth)만 사용 (어차피 미래 데이터는 없으므로)
        const rankingPromise = supabaseAdmin
            .from('qt_completions')
            .select('user_id, user_name, avatar_url')
            .eq('church_id', cid)
            .gte('completed_date', firstOfMonth);
        // .lte('completed_date', today); // [삭제] 시간대 이슈로 오늘 데이터가 랭킹에서 빠지는 문제 방지

        // 3. 전체 통계 (교회별 격리)
        const totalPromise = supabaseAdmin
            .from('qt_completions')
            .select('id', { count: 'exact', head: true })
            .eq('church_id', cid);

        // 모든 쿼리를 병렬로 실행 (속도 향상)
        const [todayRes, rankingRes, totalRes] = await Promise.all([
            todayPromise, rankingPromise, totalPromise
        ]);

        if (todayRes.error) console.error("Today Query Error:", todayRes.error);
        if (rankingRes.error) console.error("Ranking Query Error:", rankingRes.error);

        // 랭킹 데이터 가공
        const countMap: Record<string, { name: string; avatar: string | null; count: number }> = {};
        (rankingRes.data || []).forEach((row: any) => {
            if (!row.user_id) return;
            if (!countMap[row.user_id]) {
                const name = row.user_name || '성도';
                countMap[row.user_id] = {
                    name: name.length > 10 ? name.slice(0, 10) + '...' : name,
                    avatar: row.avatar_url,
                    count: 0
                };
            }
            countMap[row.user_id].count++;
        });

        const ranking = Object.values(countMap)
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        const result = {
            today: {
                count: todayRes.data?.length || 0,
                members: todayRes.data || [],
            },
            ranking,
            totalCompletions: totalRes.count || 0,
        };

        console.log(`[Stats API] Success: ${result.today.count} participants in ${churchId}`);
        return NextResponse.json(result);

    } catch (err: any) {
        console.error('[Stats API] Unexpected Error:', err);
        // 서버 에러가 나더라도 클라이언트가 멈추지 않게 빈 데이터라도 보냄
        return NextResponse.json({ ...fallbackData, error: err.message });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { user_id, user_name, avatar_url, answers, church_id } = body;

        if (!user_id) return NextResponse.json({ error: 'No user_id' }, { status: 400 });

        const today = getKoreaDateString();
        const { error } = await supabaseAdmin
            .from('qt_completions')
            .upsert(
                {
                    user_id,
                    user_name: user_name || '성도',
                    avatar_url,
                    completed_date: today,
                    church_id: church_id || 'jesus-in',
                    // answers: answers || [] // ✅ DB에 해당 컬럼이 없는 경우 전체 에러가 발생하므로 임시 주석 처리
                },
                { onConflict: 'user_id,completed_date' }
            );

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[Stats API POST Error]:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// 큐티 통계 초기화 (DELETE) - 교회별 선택적 초기화 지원
export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const churchId = searchParams.get('church_id');

        if (!churchId) {
            return NextResponse.json({ error: 'Church ID is required for selective reset' }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('qt_completions')
            .delete()
            .eq('church_id', churchId);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[Stats API DELETE Error]:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

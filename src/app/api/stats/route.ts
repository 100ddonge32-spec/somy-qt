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
    // 서버 시간이 UTC일 가능성이 높으므로 9시간을 더해 KST로 변환
    const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
    return kst.toISOString().split('T')[0];
}

// 교회 ID 표준화 함수 (한국어 이름이나 공백 등 처리)
function normalizeChurchId(id: string | null): string {
    if (!id || id === 'undefined' || id === 'null' || id.trim() === '') return 'jesus-in';
    let nid = id.trim();
    if (nid === '예수인교회' || nid === decodeURIComponent('예수인교회')) return 'jesus-in';
    return nid;
}

// 초기화 데이터 (에러 시 반환용)
const fallbackData = {
    today: { count: 0, members: [] },
    ranking: [],
    totalCompletions: 0
};

export async function GET(req: NextRequest) {
    console.log("[Stats API] === GET Request Started ===");
    try {
        const { searchParams } = new URL(req.url);
        const rawChurchId = searchParams.get('church_id');
        const cid = normalizeChurchId(rawChurchId);
        const today = getKoreaDateString();
        const firstOfMonth = today.slice(0, 7) + '-01';

        console.log(`[Stats API] CID: ${cid}, Target: ${today}, Month Start: ${firstOfMonth}`);

        // 1. 오늘 참여자 조회
        const { data: todayData, error: todayError } = await supabaseAdmin
            .from('qt_completions')
            .select('user_id, user_name, avatar_url')
            .eq('completed_date', today)
            .eq('church_id', cid)
            .order('created_at', { ascending: true });

        if (todayError) console.error("[Stats API] Today Query Error:", todayError);

        // 2. 이번 달 랭킹 조회 (전체 교회 데이터도 함께 체크하여 디버깅)
        const { data: rankingData, error: rankingError } = await supabaseAdmin
            .from('qt_completions')
            .select('user_id, user_name, avatar_url, church_id')
            .gte('completed_date', firstOfMonth);
        // .eq('church_id', cid); // 랭킹은 일단 전체 가져와서 서버에서 필터링 (디버깅 용이)

        if (rankingError) console.error("[Stats API] Ranking Query Error:", rankingError);

        // 로컬 필터링 및 가공
        const filteredRanking = (rankingData || []).filter(r => normalizeChurchId(r.church_id) === cid);

        const countMap: Record<string, { name: string; avatar: string | null; count: number }> = {};
        filteredRanking.forEach((row: any) => {
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

        // 3. 전체 통계 (교회별 격리)
        const { count: totalCount, error: totalError } = await supabaseAdmin
            .from('qt_completions')
            .select('id', { count: 'exact', head: true })
            .eq('church_id', cid);

        if (totalError) console.error("[Stats API] Total Query Error:", totalError);

        const result = {
            today: {
                count: todayData?.length || 0,
                members: todayData || [],
            },
            ranking,
            totalCompletions: totalCount || 0,
            _debug: {
                churchDetected: cid,
                totalRowsInTable: rankingData?.length || 0,
                koreaTime: today
            }
        };

        console.log(`[Stats API] Success: ${result.today.count} today, ${ranking.length} ranking, ${totalCount} total for ${cid}`);
        return NextResponse.json(result);

    } catch (err: any) {
        console.error('[Stats API] Unexpected Error:', err);
        // 서버 에러가 나더라도 클라이언트가 멈추지 않게 빈 데이터라도 보냄
        return NextResponse.json({ ...fallbackData, error: err.message });
    }
}

export async function POST(req: NextRequest) {
    console.log("[Stats API] === POST Request Started ===");
    try {
        const body = await req.json();
        const { user_id, user_name, avatar_url, answers } = body;
        const church_id = normalizeChurchId(body.church_id);

        if (!user_id) {
            console.error("[Stats API] POST Failed: No user_id");
            return NextResponse.json({ error: 'No user_id' }, { status: 400 });
        }

        const today = getKoreaDateString();
        console.log(`[Stats API] Saving Stats: User=${user_name}(${user_id}), Date=${today}, Church=${church_id}`);

        // [중요] Upsert 시도
        const { data, error } = await supabaseAdmin
            .from('qt_completions')
            .upsert(
                {
                    user_id,
                    user_name: user_name || '성도',
                    avatar_url,
                    completed_date: today,
                    church_id: church_id,
                    // answers 컬럼은 DB 구조 확인 전까지 안전하게 제외 (필요시 DB에 text[] 컬럼 추가 후 주석 해제)
                },
                { onConflict: 'user_id,completed_date' }
            );

        if (error) {
            console.error("[Stats API] Upsert Error:", error);
            // upsert가 onConflict 문제로 실패할 경우를 대비해 일반 insert 시도 (동일 날짜 중복 허용하되 집계에서 처리)
            console.log("[Stats API] Retrying with plain insert...");
            const { error: insertError } = await supabaseAdmin.from('qt_completions').insert({
                user_id,
                user_name: user_name || '성도',
                avatar_url,
                completed_date: today,
                church_id: church_id
            });
            if (insertError) throw insertError;
        }

        console.log("[Stats API] POST Success");
        return NextResponse.json({ success: true, savedDate: today, savedChurch: church_id });
    } catch (err: any) {
        console.error('[Stats API POST Error]:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// 큐티 통계 초기화 (DELETE) - 교회별 선택적 초기화 지원
export async function DELETE(req: NextRequest) {
    console.log("[Stats API] === DELETE Request Started ===");
    try {
        const { searchParams } = new URL(req.url);
        const churchId = normalizeChurchId(searchParams.get('church_id'));

        if (!churchId) {
            console.error("[Stats API] DELETE Failed: Church ID is required for selective reset");
            return NextResponse.json({ error: 'Church ID is required for selective reset' }, { status: 400 });
        }
        console.log(`[Stats API] Deleting stats for Church: ${churchId}`);

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

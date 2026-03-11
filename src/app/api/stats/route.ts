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
function getChurchIds(id: string | null): string[] {
    if (!id || id === 'undefined' || id === 'null' || id.trim() === '') return ['jesus-in', '예수인교회'];
    let nid = id.trim();
    if (nid === '예수인교회' || nid === decodeURIComponent('예수인교회') || nid === 'jesus-in') {
        return ['jesus-in', '예수인교회'];
    }
    return [nid];
}

// 단일 ID 반환용 (저장/삭제 시 사용)
function normalizeChurchId(id: string | null): string {
    const ids = getChurchIds(id);
    return ids[0]; // 기본값 'jesus-in' 반환
}

// 초기화 데이터 (에러 시 반환용)
const fallbackData = {
    today: { count: 0, members: [] },
    ranking: [],
    totalCompletions: 0
};

export async function GET(req: NextRequest) {
    console.log("[Stats API] === GET Request Started (Optimized) ===");
    try {
        const { searchParams } = new URL(req.url);
        const rawChurchId = searchParams.get('church_id');
        const cids = getChurchIds(rawChurchId);
        const today = getKoreaDateString();
        const firstOfMonth = today.slice(0, 7) + '-01';

        console.log(`[Stats API] CIDs: ${cids}, Month Start: ${firstOfMonth}`);

        // 1. 해당 교회의 성도 목록 먼저 가져오기
        const { data: profiles, error: pError } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .in('church_id', cids);

        if (pError) throw pError;

        const userIds = (profiles || []).map(p => p.id);
        if (userIds.length === 0) {
            console.log(`[Stats API] No profiles found for church IDs: ${cids}`);
            return NextResponse.json(fallbackData);
        }

        // 2. 가용 성도들의 묵상 데이터 가져오기 (인덱싱 성능을 위해 .in() 사용)
        const { data: completions, error: dbError } = await supabaseAdmin
            .from('qt_completions')
            .select('user_id, user_name, avatar_url, completed_date')
            .in('user_id', userIds)
            .gte('completed_date', firstOfMonth);

        if (dbError) throw dbError;

        const allCompletions = completions || [];

        // 2. 가공 로직
        const todayMembers: any[] = [];
        const userStats: Record<string, { name: string; avatar: string | null; dates: Set<string>; id: string }> = {};

        allCompletions.forEach(comp => {
            if (!comp.user_id) return;

            const dateStr = comp.completed_date;
            const statKey = comp.user_id; // ID를 키로 사용하여 정확하게 구분

            if (!userStats[statKey]) {
                userStats[statKey] = {
                    id: comp.user_id,
                    name: comp.user_name || '성도',
                    avatar: comp.avatar_url,
                    dates: new Set<string>()
                };
            }
            userStats[statKey].dates.add(dateStr);

            // 오늘 참여자 명단 (중복 방지)
            if (dateStr === today) {
                if (!todayMembers.find(m => m.user_id === comp.user_id)) {
                    todayMembers.push({
                        user_id: comp.user_id,
                        user_name: comp.user_name,
                        avatar_url: comp.avatar_url
                    });
                }
            }
        });

        // 3. 랭킹 생성 (참여 일수 기준)
        const ranking = Object.values(userStats)
            .map(u => ({
                name: u.name,
                avatar: u.avatar,
                count: u.dates.size
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        const result = {
            today: {
                count: todayMembers.length,
                members: todayMembers,
            },
            ranking,
            totalCompletions: ranking.reduce((acc, cur) => acc + cur.count, 0),
            _debug: {
                koreaTime: today,
                recordCount: allCompletions.length
            }
        };

        console.log(`[Stats API] Found ${allCompletions.length} completion records. Unique: ${ranking.length}`);
        return NextResponse.json(result);

    } catch (err: any) {
        console.error('[Stats API] Unexpected Error:', err);
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

        // [중요] Upsert 시도 (church_id 컬럼 제외 - 부재함)
        const { data, error } = await supabaseAdmin
            .from('qt_completions')
            .upsert(
                {
                    user_id,
                    user_name: user_name || '성도',
                    avatar_url,
                    completed_date: today,
                    answers: answers || [] // 큐티 답변 저장 복구 ✅
                },
                { onConflict: 'user_id,completed_date' }
            );

        if (error) {
            console.error("[Stats API] Upsert Error:", error);
            // upsert가 onConflict 문제로 실패할 경우를 대비해 일반 insert 시도
            console.log("[Stats API] Retrying with plain insert...");
            const { error: insertError } = await supabaseAdmin.from('qt_completions').insert({
                user_id,
                user_name: user_name || '성도',
                avatar_url,
                completed_date: today,
                answers: answers || []
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
        console.log(`[Stats API] Deleting stats (All users - church filter unavailable in this table)`);

        // church_id 컬럼이 없으므로 해당 교회의 모든 성도의 데이터를 지우려면 profiles와 조인해야 함
        const { data: profiles } = await supabaseAdmin.from('profiles').select('id').eq('church_id', churchId);
        const userIds = (profiles || []).map(p => p.id);

        if (userIds.length > 0) {
            const { error } = await supabaseAdmin
                .from('qt_completions')
                .delete()
                .in('user_id', userIds);
            if (error) throw error;
        }
        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[Stats API DELETE Error]:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

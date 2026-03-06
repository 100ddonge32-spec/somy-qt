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
    console.log("[Stats API] === GET Request Started (Automated via Community Board) ===");
    try {
        const { searchParams } = new URL(req.url);
        const rawChurchId = searchParams.get('church_id');
        const cid = normalizeChurchId(rawChurchId);
        const today = getKoreaDateString();
        const firstOfMonth = today.slice(0, 7) + '-01';

        console.log(`[Stats API] CID: ${cid}, Month Start: ${firstOfMonth}`);

        // 1. 게시판에서 '묵상나눔(is_qt: true)' 게시글들만 가져오기
        // 이번 달 전체 데이터를 가져와서 서버에서 오늘 참여자와 참여 일수를 계산합니다.
        const { data: posts, error: dbError } = await supabaseAdmin
            .from('community_posts')
            .select('user_id, user_name, avatar_url, created_at, is_qt')
            .eq('church_id', cid)
            .eq('is_qt', true)
            .gte('created_at', firstOfMonth + 'T00:00:00Z');

        if (dbError) throw dbError;

        const allPosts = posts || [];

        // 2. 가공 로직
        const todayMembers: any[] = [];
        const userStats: Record<string, { name: string; avatar: string | null; dates: Set<string> }> = {};
        let totalCompletions = 0;

        allPosts.forEach(post => {
            if (!post.user_id) return;

            const postDateFull = new Date(post.created_at);
            // KST 변환 (UTC + 9)
            const kstDate = new Date(postDateFull.getTime() + (9 * 60 * 60 * 1000));
            const dateStr = kstDate.toISOString().split('T')[0];

            // 랭킹용 일수 집계 (날짜별 동일 인물 체크: 이름을 키로 사용해 중복 계정 자연 통합)
            const statKey = post.user_name || post.user_id;
            if (!userStats[statKey]) {
                userStats[statKey] = {
                    name: post.user_name || '성도',
                    avatar: post.avatar_url,
                    dates: new Set<string>()
                };
            }
            userStats[statKey].dates.add(dateStr);
            totalCompletions++; // 이건 전체 게시글 수

            // 오늘 참여자 명단 (중복 방지)
            if (dateStr === today) {
                if (!todayMembers.find(m => (m.user_name || m.user_id) === statKey)) {
                    todayMembers.push({
                        user_id: post.user_id,
                        user_name: post.user_name,
                        avatar_url: post.avatar_url
                    });
                }
            }
        });

        // 3. 랭킹 생성 (참여 일수 기준)
        const ranking = Object.values(userStats)
            .map(u => ({
                name: u.name,
                avatar: u.avatar,
                count: u.dates.size // '며칠' 참여했는지가 점수가 됩니다.
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        const result = {
            today: {
                count: todayMembers.length,
                members: todayMembers,
            },
            ranking,
            totalCompletions: ranking.reduce((acc, cur) => acc + cur.count, 0), // 전체 참여 일수 합계
            _debug: {
                koreaTime: today,
                postCount: allPosts.length
            }
        };

        console.log(`[Stats API] Found ${allPosts.length} QT posts. Unique participants: ${ranking.length}`);
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

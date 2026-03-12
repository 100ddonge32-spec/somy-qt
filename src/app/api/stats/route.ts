// [Deployment Trigger] v3.1 - 3월 큐티왕 데이터 복구용
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
    if (!id || id === 'undefined' || id === 'null' || id.trim() === '') return [];
    let nid = id.trim();
    if (nid === '예수인교회' || nid === decodeURIComponent('예수인교회') || nid === 'jesus-in') {
        return ['jesus-in', '예수인교회'];
    }
    return [nid];
}

// 단일 ID 반환용 (저장/삭제 시 사용)
function normalizeChurchId(id: string | null): string {
    const ids = getChurchIds(id);
    return ids[0] || 'somy-main'; 
}

// 초기화 데이터 (에러 시 반환용)
const fallbackData = {
    today: { count: 0, members: [] },
    ranking: [],
    totalCompletions: 0,
    loginStats: {
        trends: [],
        topUsers: [],
        recent: []
    }
};

export async function GET(req: NextRequest) {
    console.log("[Stats API] === GET Request Started (Optimized) ===");
    try {
        const { searchParams } = new URL(req.url);
        const rawChurchId = searchParams.get('church_id');
        const cids = getChurchIds(rawChurchId);
        
        // 만약 유효한 교회 ID가 정해지지 않았으면 빈 결과 반환 (보호막 강화)
        if (cids.length === 0) {
            return NextResponse.json(fallbackData, {
                headers: { 'Cache-Control': 'no-store, max-age=0' }
            });
        }

        const today = getKoreaDateString();
        const firstOfMonth = today.slice(0, 7) + '-01';

        console.log(`[Stats API] CIDs: ${cids}, Month Start: ${firstOfMonth}`);

        // 1. 큐티 완료 기록 가져오기 (교회별 격리 필터 적용)
        const { data: completions, error: dbError } = await supabaseAdmin
            .from('qt_completions')
            .select(`
                user_id,
                user_name,
                avatar_url,
                completed_date,
                profiles!inner(church_id)
            `)
            .in('profiles.church_id', cids)
            .gte('completed_date', firstOfMonth);

        if (dbError) console.error("[Stats API] Completions fetch error:", dbError);

        // 2. 은혜나눔(community_posts) 기록 가져오기 (교회별 격리)
        const { data: posts, error: postError } = await supabaseAdmin
            .from('community_posts')
            .select('user_name, avatar_url, created_at, is_qt')
            .in('church_id', cids)
            .gte('created_at', firstOfMonth);

        if (postError) console.error("[Stats API] Posts fetch error:", postError);

        // 필터링: [📖 묵상나눔] 배지가 달린 글만 추출
        const qtPosts = (posts || []).filter(p => 
            (p.is_qt === true || p.is_qt === 'true' || p.is_qt === 1 || p.is_qt === '1')
        );

        const allCompletions = completions || [];

        // --- 3월 수동 복구 데이터 기점 (2026-03-11 기준) ---
        // [수정] 성도 명단 기반 하드코딩 데이터 격리: 예수인교회인 경우에만 기본 실적 부여 (보호막)
        const isJesusIn = cids.includes('jesus-in') || cids.includes('예수인교회');
        const MARCH_BASE: Record<string, number> = isJesusIn ? {
            '강혜진': 7,
            '이미경': 6,
            '백동희': 6,
            '최말례': 4,
            '김은영': 4,
            '장경하': 3,
            '박영희': 2,
            '최성은': 2
        } : {};

        // 제외할 명단
        const EXCLUDED_NAMES = ['최성희', '고승삼', '한결'];

        // 3. 가공 로직 (성함 기반 통합)
        const todayMembers: any[] = [];
        const userStats: Record<string, { name: string; avatar: string | null; dates: Set<string>; baseCount: number }> = {};

        // (1) 큐티 완료 기록 합산
        allCompletions.forEach(comp => {
            const nameKey = (comp.user_name || '익명성도').trim();
            if (nameKey === '익명성도' || EXCLUDED_NAMES.includes(nameKey)) return;
            
            if (!userStats[nameKey]) {
                userStats[nameKey] = { 
                    name: nameKey, 
                    avatar: comp.avatar_url, 
                    dates: new Set<string>(), 
                    baseCount: MARCH_BASE[nameKey] || 0 
                };
            }
            userStats[nameKey].dates.add(comp.completed_date);
            if (comp.avatar_url) userStats[nameKey].avatar = comp.avatar_url;

            if (comp.completed_date === today) {
                if (!todayMembers.find(m => m.user_name === nameKey)) {
                    todayMembers.push({ user_name: nameKey, avatar_url: comp.avatar_url });
                }
            }
        });

        // (2) 게시판 묵상나눔 기록 합산
        qtPosts.forEach(post => {
            const nameKey = (post.user_name || '익명성도').trim();
            if (nameKey === '익명성도' || EXCLUDED_NAMES.includes(nameKey)) return;
            
            const dateStr = post.created_at.split('T')[0];

            if (!userStats[nameKey]) {
                userStats[nameKey] = { 
                    name: nameKey, 
                    avatar: post.avatar_url, 
                    dates: new Set<string>(), 
                    baseCount: MARCH_BASE[nameKey] || 0 
                };
            }
            userStats[nameKey].dates.add(dateStr);
            if (post.avatar_url) userStats[nameKey].avatar = post.avatar_url;

            if (dateStr === today) {
                if (!todayMembers.find(m => m.user_name === nameKey)) {
                    todayMembers.push({ user_name: nameKey, avatar_url: post.avatar_url });
                }
            }
        });

        // MARCH_BASE에만 있고 DB에 없는 성도 추가
        Object.entries(MARCH_BASE).forEach(([name, count]) => {
            if (!userStats[name]) {
                userStats[name] = { name, avatar: null, dates: new Set<string>(), baseCount: count };
            }
        });

        // 4. 로그인 활동 통계 추가
        const { data: loginLogs, error: loginError } = await supabaseAdmin
            .from('activity_logs')
            .select('user_name, created_at')
            .eq('activity_type', 'LOGIN')
            .in('church_id', cids)
            .gte('created_at', firstOfMonth)
            .order('created_at', { ascending: true });

        if (loginError) console.error("[Stats API] Login logs fetch error:", loginError);

        const loginTrends: Record<string, number> = {};
        const loginUserCounts: Record<string, number> = {};

        (loginLogs || []).forEach(log => {
            const date = log.created_at.split('T')[0];
            loginTrends[date] = (loginTrends[date] || 0) + 1;
            
            const name = (log.user_name || '익명').trim();
            loginUserCounts[name] = (loginUserCounts[name] || 0) + 1;
        });

        // 결과 정렬 및 포맷팅 (최근 14일)
        const last14Days = Array.from({ length: 14 }, (_, i) => {
            const d = new Date(Date.now() + 9 * 60 * 60 * 1000);
            d.setDate(d.getDate() - (13 - i));
            return d.toISOString().split('T')[0];
        });

        const formattedTrends = last14Days.map(date => ({
            date,
            count: loginTrends[date] || 0
        }));

        const topLoginUsers = Object.entries(loginUserCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        // 5. 최근 로그인 기록 (최근 100건)
        const { data: recentLogins, error: recentError } = await supabaseAdmin
            .from('activity_logs')
            .select('user_name, created_at, user_id')
            .eq('activity_type', 'LOGIN')
            .in('church_id', cids)
            .order('created_at', { ascending: false })
            .limit(100);

        if (recentError) console.error("[Stats API] Recent logins fetch error:", recentError);

        // 6. 랭킹 생성 및 정렬
        const ranking = Object.values(userStats)
            .map(u => {
                const newDatesCount = Array.from(u.dates).filter(d => {
                    if (u.baseCount > 0) return d > '2026-03-11';
                    return true;
                }).length;

                return {
                    name: u.name,
                    avatar: u.avatar,
                    count: u.baseCount + newDatesCount
                };
            })
            .sort((a, b) => {
                if (b.count !== a.count) return b.count - a.count;
                return a.name.localeCompare(b.name);
            })
            .slice(0, 20);

        const result = {
            today: {
                count: todayMembers.length,
                members: todayMembers,
            },
            ranking,
            totalCompletions: ranking.reduce((acc: number, cur: any) => acc + cur.count, 0),
            loginStats: {
                trends: formattedTrends,
                topUsers: topLoginUsers,
                recent: (recentLogins || []).map(l => ({
                    name: l.user_name || '익명',
                    time: l.created_at,
                    userId: l.user_id
                }))
            },
            _debug: {
                koreaTime: today,
                completionsCount: allCompletions.length,
                qtPostsCount: qtPosts.length,
                uniqueUsers: Object.keys(userStats).length,
                loginLogsCount: (loginLogs || []).length
            }
        };

        console.log(`[Stats API] Ranking and login stats updated.`);
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
// Update: #오후

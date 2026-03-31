// [Deployment Trigger] v3.1 - 3월 큐티왕 데이터 복구용
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logActivity } from '@/lib/logger';

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
    let nid = id.trim().toLowerCase();
    
    // 예수인교회 관련 모든 변형 처리 (데이터 누락 방지)
    if (
        nid === '예수인교회' || 
        nid === decodeURIComponent('예수인교회') || 
        nid === 'jesus-in' || 
        nid === '예수인' || 
        nid === 'jesus' || 
        nid === '예수'
    ) {
        return ['jesus-in', '예수인교회', '예수인', 'jesus'];
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
        const firstOfMonth = searchParams.get('month') 
            ? `${searchParams.get('month')}-01` 
            : today.slice(0, 7) + '-01';

        const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
        const isFirstDay = now.getDate() === 1;

        console.log(`[Stats API] CIDs: ${cids}, Month Start: ${firstOfMonth}, isFirstDay: ${isFirstDay}`);

        // 1. 해당 교회의 사용자 ID 목록 먼저 가져오기 (매우 안전한 방식)
        const { data: churchProfiles } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('church_id', cids);
        
        const churchUserIds = (churchProfiles || []).map(p => p.id);
        const nameMap: Record<string, string> = {};
        const avatarMap: Record<string, string | null> = {};
        (churchProfiles || []).forEach(p => {
            if (p.full_name) nameMap[p.id] = p.full_name;
            if (p.avatar_url) avatarMap[p.id] = p.avatar_url;
        });

        // 큐티 완료 기록 가져오기 (데모는 user_name 기반으로 격리, 일반은 user_id 필터링)
        let completionsQuery = supabaseAdmin.from('qt_completions').select('*').gte('completed_date', firstOfMonth);
        if (rawChurchId === 'demo') {
            // 데모: user_name에 '[데모]' 접두사가 붙은 기록만 필터링
            completionsQuery = completionsQuery.like('user_name', '[데모]%');
        } else if (rawChurchId !== 'somy-main' && churchUserIds.length > 0) {
            completionsQuery = completionsQuery.in('user_id', churchUserIds);
        } else if (rawChurchId !== 'somy-main') {
            // 성도가 한 명도 없는 교회라면 빈 결과 처리
            completionsQuery = completionsQuery.in('user_id', ['none']);
        }
        
        const { data: completions, error: dbError } = await completionsQuery;
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
            '강혜진': 11,
            '백동희': 9,
            '이미경': 8,
            '김은영': 8,
            '최말례': 7,
            '장경하': 4,
            '박영희': 4,
            '안유리': 3,
            '최성은': 3
        } : {};

        // 제외할 명단
        const EXCLUDED_NAMES = ['최성희', '고승삼', '한결'];

        // 3. 가공 로직 (성함 기반 통합)
        const todayMembers: any[] = [];
        const userStats: Record<string, { name: string; avatar: string | null; dates: Set<string>; baseCount: number }> = {};

        // (1) 큐티 완료 기록 합산
        allCompletions.forEach(comp => {
            const uid = comp.user_id;
            const nameKey = (comp.user_name || nameMap[uid] || '익명성도').trim();
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
            
            // ✅ UTC 시간을 한국 시간(KST)으로 변환 후 날짜 추출 (오전 작성 건 처리)
            const kstDate = new Date(new Date(post.created_at).getTime() + 9 * 60 * 60 * 1000);
            const dateStr = kstDate.toISOString().split('T')[0];

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

        // 4. 로그인 및 주요 활동 통계 추가
        const ACTIVITY_TYPES = ['LOGIN', 'POST_CREATED', 'COMMENT_CREATED', 'QT_COMPLETED', 'THANKS_DIARY', 'MEMBER_APPROVED', 'ADMIN_MODIFIED'];

        let logsQuery = supabaseAdmin
            .from('activity_logs')
            .select('user_id, user_name, created_at, activity_type')
            .in('activity_type', ACTIVITY_TYPES)
            .gte('created_at', firstOfMonth)
            .order('created_at', { ascending: true });
            
        // 슈퍼 관리자(somy-main)가 아니면 해당 교회 활동만 필터링
        if (rawChurchId !== 'somy-main') {
            logsQuery = logsQuery.in('church_id', cids);
        }

        const { data: loginLogs, error: loginError } = await logsQuery;

        if (loginError) console.error("[Stats API] Login logs fetch error:", loginError);

        const loginTrends: Record<string, number> = {};
        const loginUserCounts: Record<string, number> = {};

        // 중복 활동 방지 (같은 날 한 유저가 여러 번 접속/활동해도 1번으로 카운트하고 싶다면 처리할 수 있지만, 현재는 활동량 전체를 봄)
        (loginLogs || []).forEach(log => {
            const kstDate = new Date(new Date(log.created_at).getTime() + 9 * 60 * 60 * 1000);
            const date = kstDate.toISOString().split('T')[0];
            loginTrends[date] = (loginTrends[date] || 0) + 1;
            
            const name = (log.user_name || nameMap[log.user_id] || '익명').trim();
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
            .slice(0, 15); // TOP 15로 확장

        // 5. 최근 활동 기록 (최근 100건)
        let recentQuery = supabaseAdmin
            .from('activity_logs')
            .select('user_name, created_at, user_id, activity_type')
            .in('activity_type', ACTIVITY_TYPES)
            .order('created_at', { ascending: false })
            .limit(100);

        if (rawChurchId !== 'somy-main') {
            recentQuery = recentQuery.in('church_id', cids);
        }

        const { data: recentLogins, error: recentError } = await recentQuery;

        if (recentError) console.error("[Stats API] Recent logins fetch error:", recentError);

        // 6. 랭킹 생성 및 정렬
        const ranking = Object.values(userStats)
            .map(u => {
                const newDatesCount = Array.from(u.dates).filter(d => {
                    if (u.baseCount > 0) return d > '2026-03-14';
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
            .slice(0, 100);

        // 7. 이전 달 우승자 (1일에만 특별히 계산하거나 요청 시 계산)
        let previousMonthRanking = null;
        if (isFirstDay || searchParams.get('include_prev') === 'true') {
            const d = new Date(now);
            d.setMonth(d.getMonth() - 1);
            const prevMonthStr = d.toISOString().slice(0, 7);
            const prevFirstOfMonth = prevMonthStr + '-01';
            const prevLastOfMonth = firstOfMonth; // 현재 달 1일 미만

            const { data: prevCompletions } = await supabaseAdmin
                .from('qt_completions')
                .select('user_name, completed_date, avatar_url')
                .in('user_id', churchUserIds)
                .gte('completed_date', prevFirstOfMonth)
                .lt('completed_date', prevLastOfMonth);

            const prevStats: Record<string, { name: string; avatar: string | null; count: number }> = {};
            (prevCompletions || []).forEach(c => {
                const name = (c.user_name || '익명').trim();
                if (!prevStats[name]) prevStats[name] = { name, avatar: c.avatar_url, count: 0 };
                prevStats[name].count++;
            });

            previousMonthRanking = Object.values(prevStats)
                .sort((a, b) => b.count - a.count)
                .slice(0, 10);
        }

        const result = {
            today: {
                count: todayMembers.length,
                members: todayMembers,
            },
            ranking,
            previousMonthRanking,
            isFirstDay,
            totalCompletions: ranking.reduce((acc: number, cur: any) => acc + cur.count, 0),
            loginStats: {
                trends: formattedTrends,
                topUsers: topLoginUsers,
                recent: (recentLogins || []).map(l => ({
                    name: l.user_name || nameMap[l.user_id] || '익명',
                    time: l.created_at,
                    userId: l.user_id,
                    activityType: l.activity_type
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

        // ✅ 큐티 완료 로그 기록 (성도 활동 추적)
        logActivity(user_id, user_name || '성도', 'QT_COMPLETED', church_id, today);

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

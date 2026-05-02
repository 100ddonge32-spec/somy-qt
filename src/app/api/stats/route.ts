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
        const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1; // 1-12
        const currentDate = now.getDate();
        const currentHour = now.getHours();

        // 현재 달 1일
        const firstOfMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
        
        // 이전 달 1일
        const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevYear = prevMonthDate.getFullYear();
        const prevMonth = prevMonthDate.getMonth() + 1;
        const firstOfPrevMonth = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;

        const isFirstDay = currentDate === 1;

        console.log(`[Stats API] CIDs: ${cids}, Curr: ${firstOfMonth}, Prev: ${firstOfPrevMonth}, Hour: ${currentHour}`);

        // 1. 해당 교회의 사용자 ID 목록 먼저 가져오기 (매우 안전한 방식)
        const { data: churchProfiles } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('church_id', cids);
        
        const churchUserIds = (churchProfiles || []).map(p => p.id);
        const totalMembers = churchUserIds.length; // ✅ 교회 전체 성도 수
        const nameMap: Record<string, string> = {};
        const avatarMap: Record<string, string | null> = {};
        (churchProfiles || []).forEach(p => {
            if (p.full_name) nameMap[p.id] = p.full_name;
            if (p.avatar_url) avatarMap[p.id] = p.avatar_url;
        });

        // 큐티 완료 기록 가져오기 (데모는 user_name 기반으로 격리, 일반은 user_id 필터링)
        let completionsQuery = supabaseAdmin.from('qt_completions').select('*').gte('completed_date', firstOfPrevMonth);
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
            .gte('created_at', firstOfPrevMonth);

        if (postError) console.error("[Stats API] Posts fetch error:", postError);

        // 필터링: [📖 묵상나눔] 배지가 달린 글만 추출
        const qtPosts = (posts || []).filter(p => 
            (p.is_qt === true || p.is_qt === 'true' || p.is_qt === 1 || p.is_qt === '1')
        );

        const allCompletions = completions || [];

        // --- 3월 수동 복구 데이터 최종 버전 (사용자 제공 스크린샷 기준 2026-04-01 반영) ---
        const isJesusIn = cids.includes('jesus-in') || cids.includes('예수인교회');
        const MARCH_BASE: Record<string, number> = isJesusIn ? {
            '강혜진': 27,
            '백동희': 26,
            '김은영': 24,
            '최말례': 23,
            '이미경': 22,
            '박영희': 14,
            '안유리': 9,
            '백동환': 8,
            '장경하': 8,
            '최성은': 6,
            '김혜윤': 1
        } : {};

        // 제외할 명단
        const EXCLUDED_NAMES = ['최성희', '고승삼', '한결'];

        // 3. 가공 로직 (성함 기반 통합)
        const todayMembers: any[] = [];
        const userStats: Record<string, { name: string; avatar: string | null; dates: Set<string>; baseCount: number }> = {};
        const prevUserStats: Record<string, { name: string; avatar: string | null; dates: Set<string> }> = {};

        // (1) 큐티 완료 기록 합산
        allCompletions.forEach(comp => {
            const uid = comp.user_id;
            const nameKey = (comp.user_name || nameMap[uid] || '익명성도').trim();
            if (nameKey === '익명성도' || EXCLUDED_NAMES.includes(nameKey)) return;
            
            const dateStr = comp.completed_date;
            const isPrevMonth = dateStr >= firstOfPrevMonth && dateStr < firstOfMonth;

            if (isPrevMonth) {
                if (!prevUserStats[nameKey]) prevUserStats[nameKey] = { name: nameKey, avatar: comp.avatar_url, dates: new Set() };
                prevUserStats[nameKey].dates.add(dateStr);
                if (comp.avatar_url) prevUserStats[nameKey].avatar = comp.avatar_url;
            } else if (dateStr >= firstOfMonth) {
                if (!userStats[nameKey]) userStats[nameKey] = { name: nameKey, avatar: comp.avatar_url, dates: new Set(), baseCount: 0 };
                userStats[nameKey].dates.add(dateStr);
                if (comp.avatar_url) userStats[nameKey].avatar = comp.avatar_url;

                if (dateStr === today && !todayMembers.find(m => m.user_name === nameKey)) {
                    todayMembers.push({ user_name: nameKey, avatar_url: comp.avatar_url });
                }
            }
        });

        // (2) 게시판 묵상나눔 기록 합산
        qtPosts.forEach(post => {
            const nameKey = (post.user_name || '익명성도').trim();
            if (nameKey === '익명성도' || EXCLUDED_NAMES.includes(nameKey)) return;
            
            const kstDate = new Date(new Date(post.created_at).getTime() + 9 * 60 * 60 * 1000);
            const dateStr = kstDate.toISOString().split('T')[0];
            const isPrevMonth = dateStr >= firstOfPrevMonth && dateStr < firstOfMonth;

            if (isPrevMonth) {
                if (!prevUserStats[nameKey]) prevUserStats[nameKey] = { name: nameKey, avatar: post.avatar_url, dates: new Set() };
                prevUserStats[nameKey].dates.add(dateStr);
                if (post.avatar_url) prevUserStats[nameKey].avatar = post.avatar_url;
            } else if (dateStr >= firstOfMonth) {
                if (!userStats[nameKey]) userStats[nameKey] = { name: nameKey, avatar: post.avatar_url, dates: new Set(), baseCount: 0 };
                userStats[nameKey].dates.add(dateStr);
                if (post.avatar_url) userStats[nameKey].avatar = post.avatar_url;

                if (dateStr === today && !todayMembers.find(m => m.user_name === nameKey)) {
                    todayMembers.push({ user_name: nameKey, avatar_url: post.avatar_url });
                }
            }
        });

        // 3월 데이터 병합 (만약 이전 달이나 이번 달이 3월인 경우 수동 데이터 반영)
        if (prevMonth === 3 && prevYear === 2026) {
            Object.entries(MARCH_BASE).forEach(([name, count]) => {
                if (!prevUserStats[name]) prevUserStats[name] = { name, avatar: null, dates: new Set() };
            });
        }
        if (currentMonth === 3 && currentYear === 2026) {
            Object.entries(MARCH_BASE).forEach(([name, count]) => {
                if (!userStats[name]) userStats[name] = { name, avatar: null, dates: new Set(), baseCount: count };
                else userStats[name].baseCount = count;
            });
        }

        // 4. 로그인 및 주요 활동 통계 추가
        const ACTIVITY_TYPES = ['LOGIN', 'POST_CREATED', 'COMMENT_CREATED', 'QT_COMPLETED', 'THANKS_DIARY', 'MEMBER_APPROVED', 'ADMIN_MODIFIED'];

        let logsQuery = supabaseAdmin
            .from('activity_logs')
            .select('user_id, user_name, created_at, activity_type')
            .in('activity_type', ACTIVITY_TYPES)
            .gte('created_at', firstOfPrevMonth)
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

        // 6. [중요] 3월 최종 시상 데이터 (사용자 요청 반영)
        const FINAL_MARCH_DATA = [
            { name: '강혜진', count: 27 },
            { name: '백동희', count: 26 },
            { name: '김은영', count: 24 },
            { name: '최말례', count: 23 },
            { name: '이미경', count: 22 },
            { name: '박영희', count: 14 },
            { name: '안유리', count: 9 },
            { name: '백동환', count: 8 },
            { name: '장경하', count: 8 },
            { name: '최성은', count: 6 },
            { name: '김혜윤', count: 1 }
        ];

        const ranking = Object.values(userStats)
            .map(u => ({
                name: u.name,
                avatar: u.avatar,
                count: Array.from(u.dates).length + u.baseCount
            }))
            .sort((a, b) => {
                if (b.count !== a.count) return b.count - a.count;
                return a.name.localeCompare(b.name);
            })
            .slice(0, 100);

        // 7. 4월 초순(7일까지)에는 3월의 영광을 상단에 '시상' 형식으로 노출
        let previousMonthRanking = null;
        if (currentDate <= 7) {
            if (prevMonth === 3 && prevYear === 2026) {
                previousMonthRanking = FINAL_MARCH_DATA;
            } else {
                previousMonthRanking = Object.values(prevUserStats)
                    .map(u => ({
                        name: u.name,
                        avatar: u.avatar,
                        count: Array.from(u.dates).length // 이전 달의 순수 실적
                    }))
                    .sort((a, b) => {
                        if (b.count !== a.count) return b.count - a.count;
                        return a.name.localeCompare(b.name);
                    })
                    .slice(0, 15);
            }
        }

        // 8. 주간 묵상율 계산 (최근 7일간 1회 이상 참여한 성도 비율)
        const last7DaysDate = new Date(Date.now() + 9 * 60 * 60 * 1000);
        last7DaysDate.setDate(last7DaysDate.getDate() - 7);
        const last7DaysStr = last7DaysDate.toISOString().split('T')[0];
        
        const weeklyUniqueUsers = new Set(
            allCompletions
                .filter(c => c.completed_date >= last7DaysStr)
                .map(c => c.user_name || c.user_id)
        ).size;
        
        const weeklyRate = totalMembers > 0 ? Math.round((weeklyUniqueUsers / totalMembers) * 100) : 0;

        const result = {
            today: {
                count: todayMembers.length,
                members: todayMembers,
            },
            ranking,
            rankings: ranking, 
            totalMembers,
            weeklyRate,        // ✅ 주간 묵상율 추가
            previousMonthRanking,
            previousMonth: prevMonth,
            isFirstDay,
            currentHour,
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

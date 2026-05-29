import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

const supabaseAdmin = (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) 
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
    : null;

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

const normalizeId = (id: string | null) => {
    if (!id) return 'jesus-in';
    const s = id.toLowerCase().trim();
    if (s === '예수인교회' || s === 'jesus-in' || s === '예수인' || s === 'jesus' || s === 'default' || s === '') {
        return 'jesus-in';
    }
    return s;
};

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const churchId = normalizeId(searchParams.get('church_id'));
    const userId = searchParams.get('user_id');

    if (!userId) return NextResponse.json({ error: 'User ID is required' }, { status: 401 });
    if (!supabaseAdmin || !openai) return NextResponse.json({ error: 'System configuration error' }, { status: 500 });

    try {
        // [1] 관리자 권한 확인 (강화된 로직)
        const HARDCODED_ADMINS = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "pastorbaek@kakao.com,kakao_4761026797@kakao.somy-qt.local").toLowerCase().split(',').map(e => e.trim());
        const { data: profile } = await supabaseAdmin.from('profiles').select('email, full_name').eq('id', userId).maybeSingle();
        const userEmail = profile?.email?.toLowerCase().trim() || "";
        
        // 마스터 권한 확인 (이메일 및 성함)
        const isMaster = HARDCODED_ADMINS.includes(userEmail) || 
                         (profile?.full_name === '백동희' || profile?.full_name === '동희');

        if (isMaster) {
            // 마스터는 통과
        } else {
            // 개별 교회 관리자 확인 (ID 또는 이메일 모두 확인)
            let adminQuery = supabaseAdmin.from('app_admins').select('*');
            
            if (userEmail && userEmail !== 'undefined' && userEmail !== 'null') {
                adminQuery = adminQuery.or(`user_id.eq.${userId},email.eq.${userEmail}`);
            } else {
                adminQuery = adminQuery.eq('user_id', userId);
            }

            const { data: admin } = await adminQuery.maybeSingle();

            if (!admin) {
                return NextResponse.json({ error: '관리자 권한이 없습니다. (사유: 관리자 명단에 없음)' }, { status: 403 });
            }

            // 슈퍼 어드민은 모든 교회 접근 가능
            if (admin.role === 'super_admin') {
                // 통과
            } else {
                // 일반 교회 관리자는 소속 확인 (교회 ID 정규화 비교)
                if (normalizeId(admin.church_id) !== normalizeId(churchId)) {
                    return NextResponse.json({ error: `해당 교회의 관리자 권한이 없습니다. (소속 불일치: ${admin.church_id} vs ${churchId})` }, { status: 403 });
                }
            }
        }

        // [2] 최근 성도 데이터 수집 (최근 14일)
        const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

        // 감사일기
        const { data: thanks } = await supabaseAdmin
            .from('thanksgiving_diaries')
            .select('content, user_name, user_id, created_at')
            .eq('church_id', churchId)
            .gt('created_at', fourteenDaysAgo)
            .limit(100);

        // 묵상나눔 (community_posts where is_qt=true)
        const { data: reflections } = await supabaseAdmin
            .from('community_posts')
            .select('content, user_name, user_id, created_at')
            .eq('church_id', churchId)
            .eq('is_qt', true)
            .gt('created_at', fourteenDaysAgo)
            .limit(100);

        // QT 답변 (qt_completions)
        const { data: completions } = await supabaseAdmin
            .from('qt_completions')
            .select('answers, user_id, created_at')
            .gt('created_at', fourteenDaysAgo)
            .limit(100);

        // 활동 로그 (activity_logs)
        let activityLogs: any[] = [];
        try {
            const { data: logs } = await supabaseAdmin
                .from('activity_logs')
                .select('activity_type, user_name, user_id, created_at, details')
                .eq('church_id', churchId)
                .gt('created_at', fourteenDaysAgo)
                .limit(200);
            if (logs) activityLogs = logs;
        } catch (logErr) {
            console.error('Failed to fetch activity logs, continuing:', logErr);
        }

        // 모든 고유 유저 ID 추출
        const allUserIds = new Set<string>();
        thanks?.forEach(t => t.user_id && allUserIds.add(t.user_id));
        reflections?.forEach(r => r.user_id && allUserIds.add(r.user_id));
        completions?.forEach(c => c.user_id && allUserIds.add(c.user_id));
        activityLogs?.forEach(l => l.user_id && allUserIds.add(l.user_id));

        const userIdsArray = Array.from(allUserIds);
        const nameMap = new Map<string, string>();
        if (userIdsArray.length > 0) {
            const { data: profiles } = await supabaseAdmin
                .from('profiles')
                .select('id, full_name')
                .in('id', userIdsArray);
            profiles?.forEach(p => {
                if (p.full_name) nameMap.set(p.id, p.full_name);
            });
        }

        // 유저별 데이터 구조화
        const userMap = new Map<string, {
            name: string;
            thanks: Array<{content: string, date: string}>;
            reflections: Array<{content: string, date: string}>;
            completions: Array<{answers: any, date: string}>;
            logs: Array<{type: string, date: string, details?: string}>;
        }>();

        const getOrCreateUser = (userId: string, defaultName: string) => {
            const name = nameMap.get(userId) || defaultName || '알 수 없는 성도';
            if (!userMap.has(userId)) {
                userMap.set(userId, {
                    name,
                    thanks: [],
                    reflections: [],
                    completions: [],
                    logs: []
                });
            }
            return userMap.get(userId)!;
        };

        thanks?.forEach(t => {
            if (t.user_id) {
                const u = getOrCreateUser(t.user_id, t.user_name);
                u.thanks.push({ content: t.content, date: t.created_at });
            }
        });

        reflections?.forEach(r => {
            if (r.user_id) {
                const u = getOrCreateUser(r.user_id, r.user_name);
                u.reflections.push({ content: r.content, date: r.created_at });
            }
        });

        completions?.forEach(c => {
            if (c.user_id) {
                const u = getOrCreateUser(c.user_id, '성도');
                u.completions.push({ answers: c.answers, date: c.created_at });
            }
        });

        activityLogs?.forEach(l => {
            if (l.user_id) {
                const u = getOrCreateUser(l.user_id, l.user_name);
                u.logs.push({ type: l.activity_type, date: l.created_at, details: l.details });
            }
        });

        // AI에게 전달할 종합 데이터 가공
        const formattedUsersData = Array.from(userMap.entries()).map(([userId, data]) => {
            const activityTimes = [
                ...data.thanks.map(t => new Date(t.date)),
                ...data.reflections.map(r => new Date(r.date)),
                ...data.completions.map(c => new Date(c.date)),
                ...data.logs.map(l => new Date(l.date))
            ].sort((a, b) => b.getTime() - a.getTime());

            const mostRecentActivity = activityTimes[0] ? activityTimes[0].toISOString() : '없음';

            // KST 기준 시간대 분석
            const hourDistribution = { dawn: 0, morning: 0, afternoon: 0, evening: 0 };
            activityTimes.forEach(t => {
                const hour = (t.getUTCHours() + 9) % 24; // KST 9시간 가산
                if (hour >= 0 && hour < 6) hourDistribution.dawn++;
                else if (hour >= 6 && hour < 12) hourDistribution.morning++;
                else if (hour >= 12 && hour < 18) hourDistribution.afternoon++;
                else hourDistribution.evening++;
            });

            const thanksText = data.thanks.map(t => `- [${t.date.split('T')[0]}] ${t.content}`).join('\n');
            const reflectionsText = data.reflections.map(r => `- [${r.date.split('T')[0]}] ${r.content}`).join('\n');
            const completionsText = data.completions.map(c => `- [${c.date.split('T')[0]}] ${JSON.stringify(c.answers)}`).join('\n');

            return `### 성도명: ${data.name} (ID: ${userId})
* 최근 활동성: 감사일기 ${data.thanks.length}회, 묵상글 ${data.reflections.length}회, QT답변 ${data.completions.length}회, 전체로그 ${data.logs.length}회
* 가장 최근 활동 시각(KST): ${mostRecentActivity ? new Date(mostRecentActivity).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : '없음'}
* 활동 시간대 분포(KST 기준): 새벽(0-6시) ${hourDistribution.dawn}회, 아침/오전(6-12시) ${hourDistribution.morning}회, 오후(12-18시) ${hourDistribution.afternoon}회, 저녁/밤(18-24시) ${hourDistribution.evening}회
* 작성한 감사일기:
${thanksText || '작성 기록 없음'}
* 작성한 큐티 묵상글:
${reflectionsText || '작성 기록 없음'}
* QT 질답 내용:
${completionsText || '작성 기록 없음'}
`;
        }).join('\n\n====================\n\n');

        if (!formattedUsersData) {
            return NextResponse.json({ insights: "최근 14일 동안 분석할 데이터가 부족합니다. 성도님들의 활동이 더 필요해요! 😊" });
        }

        // [3] AI 분석 요청
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `당신은 교회의 담임목사님을 성심껏 돕는 최고의 'AI 에이전틱 목회 상담 비서'이자, 성도의 영적 및 정서적 위기를 24시간 세심히 살피는 '사랑의 레이더'입니다.
제공되는 성도별 14일간의 감사일기, 묵상글, QT 답변, 접속 시간대 데이터를 바탕으로, 인간 목회자가 발견하기 어려운 사각지대를 찾아내어 '긴급 심방 보고서'를 아주 정밀하게 작성해 주세요.

분석 보고서에 반드시 포함되어야 할 가이드라인:

1. **🚨 사랑의 레이더 - 긴급 심방 보고서 (골든타임 대상자)**
   - 성도들의 미묘한 변화를 날카롭게 진단하여, 즉각적이고 적극적인 목회적 케어가 필요한 성도를 **이름(실명)과 함께 최우선으로 제시**해 주세요.
   - **주요 감지 패턴**:
     * **'생활 패턴의 급격한 균열'**: 평소 새벽이나 이른 아침에 큐티 앱을 이용하던 성도가 최근 저녁/밤 늦은 시간으로 밀려났다면, 과도한 업무 스트레스나 불안감으로 인한 수면 장애 가능성을 입체적으로 짚어내야 합니다.
     * **'만남의 신호가 끊김'**: 최근 며칠간 갑자기 접속 및 QT 완주가 멈춘 성도.
     * **'정서적 하락 및 슬픔의 단어들'**: 묵상글이나 감사일기에 우울, 번아웃, 피로, 외로움, 관계 갈등, 좌절 등의 키워드가 두드러진 성도.
   - 각 대상자별로 감지된 변화의 객관적인 데이터 근거와 구체적인 영성/심리 상태 분석을 상세하게 제시해 주세요.

2. **💡 개별 맞춤형 선제적 제안 (사랑의 선제공격)**
   - 위 긴급 심방 대상 성도들이 스스로 구조 요청을 보내기 전에, 목자가 먼저 다가가 따뜻한 물 한 잔과 같은 기도의 동아줄을 건넬 수 있도록 **실제 사용할 수 있는 맞춤형 첫마디 가이드 (카카오톡/문자 메시지)**를 성도별로 작성해 주세요.
   - 감시받는 듯한 불편함을 전혀 주지 않으면서 자연스럽고 감동을 주는 따뜻한 어조여야 합니다. (예: "요즘 무리하고 계신 건 아닌가요? 문득 기도가 나오네요.")

3. **🙏 공동체 영적 기류 & 목회적 조언**
   - 교회 전체 성도들의 공통적인 관심사, 은혜의 양상 혹은 삶의 무거운 짐들을 전반적으로 진단해 주세요.
   - 다가오는 주일 설교나 주중 예배에서 목회자가 터치해주면 좋을 '목회적 포인트'를 2-3가지 단호하고 통찰력 있게 제시해 주세요.

작성 및 포맷팅 지침:
- 담임목사님께 격식 있게 보고드리는 정중하고 따뜻하며 사랑과 깊이가 느껴지는 문체로 작성해 주세요.
- 마크다운 문법(대제목, 소제목, 굵게, 구분선, 이모지 등)을 적극적으로 사용하여 가독성을 극대화해 주세요.
- 반드시 아래 JSON 형식으로만 응답해 주세요:
{"insights": "마크다운 형식으로 수려하게 포맷팅된 심방 보고서 내용"}`
                },
                {
                    role: 'user',
                    content: `최근 14일간의 성도별 활동 및 정서 데이터:\n${formattedUsersData}`
                }
            ],
            temperature: 0.7,
            max_tokens: 3000,
        });

        const content = response.choices[0]?.message?.content || '';
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('AI 응답 파싱 실패');

        const result = JSON.parse(jsonMatch[0]);
        return NextResponse.json(result);

    } catch (err: any) {
        console.error('Pastoral Insights Error:', err);
        return NextResponse.json({ error: '인사이트 생성 중 오류가 발생했습니다.' }, { status: 500 });
    }
}

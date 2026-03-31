import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const normalizeId = (id: string | null) => {
    if (!id) return 'jesus-in';
    const s = id.toLowerCase().trim();
    if (s === '예수인교회' || s === 'jesus-in' || s === '예수인' || s === 'jesus' || s === 'default' || s === 'somy-main' || s === '') {
        return 'jesus-in';
    }
    return s;
};

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const churchId = normalizeId(searchParams.get('church_id'));
    const userId = searchParams.get('user_id');

    if (!userId) return NextResponse.json({ error: 'User ID is required' }, { status: 401 });

    try {
        // [1] 관리자 권한 확인
        const { data: admin } = await supabaseAdmin
            .from('app_admins')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        const HARDCODED_ADMINS = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "pastorbaek@kakao.com,kakao_4761026797@kakao.somy-qt.local").toLowerCase().split(',').map(e => e.trim());
        const { data: profile } = await supabaseAdmin.from('profiles').select('email').eq('id', userId).maybeSingle();
        const isMaster = HARDCODED_ADMINS.includes(profile?.email?.toLowerCase() || '');

        if (!isMaster && (!admin || admin.church_id !== churchId)) {
            return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
        }

        // [2] 최근 성도 데이터 수집 (최근 14일)
        const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

        // 감사일기
        const { data: thanks } = await supabaseAdmin
            .from('thanksgiving_diaries')
            .select('content, user_name')
            .eq('church_id', churchId)
            .gt('created_at', fourteenDaysAgo)
            .limit(50);

        // 묵상나눔 (community_posts where is_qt=true)
        const { data: reflections } = await supabaseAdmin
            .from('community_posts')
            .select('content, user_name')
            .eq('church_id', churchId)
            .eq('is_qt', true)
            .gt('created_at', fourteenDaysAgo)
            .limit(50);

        // QT 답변 (qt_completions)
        const { data: completions } = await supabaseAdmin
            .from('qt_completions')
            .select('answers, user_id')
            .gt('created_at', fourteenDaysAgo)
            .limit(50);
        
        // 유저 정보 매칭용 (completions 에는 이름이 없음)
        const userIds = Array.from(new Set(completions?.map(c => c.user_id) || []));
        const { data: profiles } = await supabaseAdmin.from('profiles').select('id, full_name').in('id', userIds);
        const nameMap = new Map(profiles?.map(p => [p.id, p.full_name]));

        const combinedData = [
            ...(thanks?.map(t => `[감사] ${t.user_name}: ${t.content}`) || []),
            ...(reflections?.map(r => `[묵상] ${r.user_name}: ${r.content}`) || []),
            ...(completions?.map(c => `[QT답변] ${nameMap.get(c.user_id) || '성도'}: ${JSON.stringify(c.answers)}`) || [])
        ].join('\n\n');

        if (!combinedData) {
            return NextResponse.json({ insights: "최근 14일 동안 분석할 데이터가 부족합니다. 성도님들의 활동이 더 필요해요! 😊" });
        }

        // [3] AI 분석 요청
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `당신은 교회의 담임목사님을 돕는 '신학적 영성 상담 AI 비서'입니다. 
성도들이 작성한 큐티 묵상, 감사 일기, 질문 답변 내용을 바탕으로 목회적 제언을 작성해야 합니다.

작성 가이드:
1. 성도들의 전체적인 영적 상태와 주요 관심 키워드를 파악하세요.
2. 성도들이 공통적으로 느끼는 은혜나 어려움이 있다면 언급해 주세요.
3. 목회자가 주일 설교나 심방 시 참고할 만한 '목회적 포인트'를 3~4가지 제시하세요.
4. 따뜻하고 격려하는 어조를 사용하되, 목회자에게 드리는 보고서 형식을 갖춰주세요.
5. 특정 성도의 이름을 언급하기보다는 전체적인 영적 분위기를 분석해 주세요. (필요한 경우에만 조심스럽게 언급)

반드시 아래 JSON 형식으로만 답하세요:
{"insights": "분석 내용 (마크다운 형식 가능)"}`
                },
                {
                    role: 'user',
                    content: `최근 14일간의 성도 활동 데이터:\n${combinedData}`
                }
            ],
            temperature: 0.7,
            max_tokens: 2000,
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

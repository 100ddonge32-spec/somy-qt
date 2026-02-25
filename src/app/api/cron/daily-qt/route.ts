import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { getTodayReading } from '@/lib/reading-plan';
import webpush from 'web-push';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

webpush.setVapidDetails(
    'mailto:pastorbaek@kakao.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BCpTn0SHIYSZzjST5xxL1Cv9svmlp3f9Xmvt9FSALBvo4QwLQCBlo_mu4ThoMHgINRmAk4c9sxwVwI2QtDyHr1I',
    process.env.VAPID_PRIVATE_KEY || 'LAAS6aJenIKYBShIGZsWVKhXNOMKwkuXvpf2NLCGZAI'
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function getKoreaDateString(): string {
    return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
}

export async function GET(req: NextRequest) {
    // Vercel Cron 인증 확인
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        // CRON_SECRET 없으면 인증 스킵 (베타)
        if (process.env.CRON_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    const today = getKoreaDateString();

    // 이미 오늘 큐티가 있는지 확인
    const { data: existing } = await supabaseAdmin
        .from('daily_qt')
        .select('id')
        .eq('date', today)
        .single();

    if (existing) {
        return NextResponse.json({ message: '오늘 큐티가 이미 존재합니다.', date: today });
    }

    // 오늘의 성경 구절 가져오기
    const reference = getTodayReading();

    try {
        // 1. 성경 본문 가져오기
        const bibleRes = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `당신은 성경 전문가이자 신중한 목회자입니다. 
주어진 성경 범위(예: 민수기 1-2)에서 묵상에 가장 적합한 **연속된 15~20개 절**을 추출하여 제공하세요. 

**[지시사항]**
1. 절대로 본문의 내용을 요약하거나 현대어로 의역하지 마세요. 반드시 개역개정판의 **원문 그대로(Verbatim)** 제공해야 합니다.
2. 절대로 동일한 문장이나 단어를 무한 반복(루프)하지 마세요.
3. 각 절은 성경의 순서대로 누락 없이 자연스럽게 이어져야 합니다.
4. **각 절의 시작에 반드시 절 번호를 기입하세요 (예: 1. 여호와께서... 2. 이스라엘...).**
5. 성경 본문의 숫자들이나 인명, 지명을 절대 임의로 바꾸지 마세요.
6. 반드시 아래 JSON 형식으로만 답하세요:
{"passage":"본문 내용 (줄바꿈은 \\n으로)"}`
                },
                { role: 'user', content: `성경구절: ${reference}` }
            ],
            temperature: 0,
            max_tokens: 2000,
        });

        const bibleContent = bibleRes.choices[0]?.message?.content || '';
        const bibleJson = JSON.parse(bibleContent.match(/\{[\s\S]*\}/)![0]);
        const passage = bibleJson.passage;

        // 2. 묵상 질문 + 기도문 생성
        const qtRes = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `당신은 개혁주의 신학(Reformed Theology)에 입각하여 말씀을 해석하는 신중한 목회자이자 큐티 전문가입니다. 성도들이 말씀을 깊이 묵상하고 삶에 적용할 수 있도록 돕습니다.
주어진 성경 본문을 바탕으로:
1. 본문 해설: 개혁주의 신학의 관점(하나님의 주권, 전적인 은혜, 언약 등)을 반영하여 본문의 흐름과 이면에 담긴 영적인 의미를 깊이 있게 해설하세요. 분량은 대략 10줄 내외로 충분하고 풍성하게 작성하며, 단어나 의미 해석에 있어 원어(히브리어/헬라어)의 의미나 성경적 배경 지식이 필요하다면 문단 끝이나 중간에 <참고> 형식으로 함께 설명해주세요.
2. 묵상 질문 3개: 성도의 삶에 울림을 주는 실질적이고 깊이 있는 질문
3. 마무리 기도문 1개: 본문의 은혜를 갈구하는 간절하고 진실된 기도

반드시 아래 JSON 형식으로만 답하세요:
{"interpretation":"해설 내용","question1":"질문1","question2":"질문2","question3":"질문3","prayer":"기도문"}`
                },
                { role: 'user', content: `성경구절: ${reference}\n본문:\n${passage}` }
            ],
            temperature: 0.7,
            max_tokens: 1500,
        });

        const qtContent = qtRes.choices[0]?.message?.content || '';
        const qtJson = JSON.parse(qtContent.match(/\{[\s\S]*\}/)![0]);

        // 3. DB에 저장
        const { error } = await supabaseAdmin
            .from('daily_qt')
            .upsert({
                date: today,
                reference,
                passage: `${passage}|||${qtJson.interpretation}`, // 원문과 해설을 ||| 로 결합하여 저장
                question1: qtJson.question1,
                question2: qtJson.question2,
                question3: qtJson.question3,
                prayer: qtJson.prayer,
                ai_generated: true,
            }, { onConflict: 'date' });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // [푸시 알림] 자동 생성된 오늘 큐티 알림 전송
        try {
            const { data: subscriptions } = await supabaseAdmin
                .from('push_subscriptions')
                .select('user_id, subscription');

            if (subscriptions && subscriptions.length > 0) {
                await Promise.all(subscriptions.map(async (sub) => {
                    if (sub.subscription) {
                        try {
                            const payload = JSON.stringify({
                                title: '📖 오늘의 큐티가 도착했습니다!',
                                body: `${today} ${reference} 말씀이 준비되었습니다. ✨`,
                                url: '/',
                                userId: sub.user_id
                            });
                            await webpush.sendNotification(sub.subscription, payload);
                        } catch (e) { }
                    }
                }));
            }

            // [DB 알림] 모든 사용자에게 알림 저장
            const { data: profiles } = await supabaseAdmin.from('profiles').select('id');
            if (profiles && profiles.length > 0) {
                const notis = profiles.map(p => ({
                    user_id: p.id,
                    type: 'qt',
                    actor_name: `${today} ${reference}`,
                    is_read: false
                }));
                await supabaseAdmin.from('notifications').insert(notis);
            }
        } catch (e) { }

        return NextResponse.json({
            success: true,
            date: today,
            reference,
            message: '오늘의 큐티가 자동 생성되었습니다! 🐑'
        });

    } catch (err: any) {
        console.error('Cron QT generation error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

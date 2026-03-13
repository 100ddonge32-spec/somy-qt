import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { getTodayReading } from '@/lib/reading-plan';
import webpush from '@/lib/webpush';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
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
        // [알림] 자동 생성된 오늘 큐티 알림 전송 (신규 로직 포함)
        try {
            const { data: subscriptions } = await supabaseAdmin
                .from('push_subscriptions')
                .select('user_id, subscription');

            if (subscriptions && subscriptions.length > 0) {
                await Promise.all(subscriptions.map(async (sub) => {
                    if (sub.subscription) {
                        try {
                            const payload = JSON.stringify({
                                title: '📖 오늘의 말씀과 큐티가 도착했습니다!',
                                body: `${today} 묵상과 칼럼이 준비되었습니다. ✨`,
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

        // [신규] 오늘의 말씀 & 담임목사 칼럼 자동 생성 (큐티와 별개)
        try {
            console.log('[Cron] Generating Word of the Day & Pastor Column...');
            // 4. 오늘의 말씀(별도) 생성
            const verseRes = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: `성도들에게 매일 아침 전할 은혜로운 '오늘의 말씀'을 한 구절 선정하고 그 이유를 짧게 설명하세요. 
주어진 큐티 본문(${reference})과는 가급적 중복되지 않는 다른 성경의 은혜로운 구절을 선정해 주세요.
반드시 아래 JSON 형식으로만 답하세요:
{"reference":"성경구절(장:절)","verse":"말씀 내용"}`
                    }
                ],
                temperature: 0.8,
            });

            const verseContent = verseRes.choices[0]?.message?.content || '';
            const verseJson = JSON.parse(verseContent.match(/\{[\s\S]*\}/)![0]);

            // 5. 담임목사 칼럼 생성
            const columnRes = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: `당신은 교회의 담임목사입니다. 오늘의 말씀 [${verseJson.reference}: ${verseJson.verse}]을 바탕으로 성도들에게 깊은 위로와 영적 도전을 주는 '담임목사 칼럼'을 작성해주세요. 

[작성 가이드라인]
1. 분량: 약 500자 내외로 풍성하게 작성하세요.
2. 구조: 말씀 묵상 - 삶의 적용 - 따뜻한 격려와 축복의 순서로 구성하세요.
3. 말투: 성도를 진심으로 아끼는 마음이 담긴 자애롭고 은혜로운 목과소리(존댓말)를 사용하세요.
4. 내용: 단순히 말씀을 설명하기보다, 오늘을 살아가는 성도들의 삶에 실제적인 힘이 되는 조언을 포함하세요.

반드시 아래 JSON 형식으로만 답하세요:
{"title":"제목","content":"내용"}`
                    }
                ],
                temperature: 0.7,
            });

            const columnContent = columnRes.choices[0]?.message?.content || '';
            const columnJson = JSON.parse(columnContent.match(/\{[\s\S]*\}/)![0]);

            // 6. 교회 설정(church_settings) 업데이트
            // 플랫폼 메인과 예수인교회(ID: 1) 설정을 업데이트합니다.
            const { data: currentSettings } = await supabaseAdmin
                .from('church_settings')
                .select('plan')
                .eq('id', 1)
                .single();

            let newPlan = currentSettings?.plan || 'premium';
            // 기존 tv_text, tv_ref, column_title, column_content 제거 후 새로 추가
            newPlan = newPlan.split('|').filter((p: string) => 
                !p.startsWith('tv_text:') && 
                !p.startsWith('tv_ref:') && 
                !p.startsWith('column_title:') && 
                !p.startsWith('column_content:')
            ).join('|');
            
            newPlan += `|tv_text:${encodeURIComponent(verseJson.verse)}`;
            newPlan += `|tv_ref:${encodeURIComponent(verseJson.reference)}`;
            newPlan += `|column_title:${encodeURIComponent(columnJson.title)}`;
            newPlan += `|column_content:${encodeURIComponent(columnJson.content)}`;

            await supabaseAdmin
                .from('church_settings')
                .update({
                    today_verse_text: verseJson.verse,
                    today_verse_ref: verseJson.reference,
                    pastor_column_title: columnJson.title,
                    pastor_column_content: columnJson.content,
                    plan: newPlan
                })
                .eq('id', 1);

            console.log('[Cron] Word of the Day & Pastor Column updated successfully.');

        } catch (e) {
            console.error('오늘의 말씀/칼럼 생성 실패:', e);
        }

        return NextResponse.json({
            success: true,
            date: today,
            reference,
            message: '오늘의 큐티 및 말씀/칼럼이 자동 생성되었습니다! 🐑'
        });

    } catch (err: any) {
        console.error('Cron QT generation error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

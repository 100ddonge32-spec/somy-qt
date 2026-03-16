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

        // [신규] '이번주 암송구절' & 담임목사 칼럼 자동 생성 (한 주에 한 번, 월요일 또는 데이터 부재 시)
        try {
            const now = new Date();
            const dayOfWeek = now.getDay(); // 0: 일, 1: 월, ...
            
            // 기존 설정 가져오기
            const { data: currentSettings } = await supabaseAdmin
                .from('church_settings')
                .select('*')
                .eq('id', 1)
                .single();

            const planStr = currentSettings?.plan || '';
            const isAiGenerated = planStr.includes('|column_ai:true');
            // 관리자가 직접 입력했는지 여부 확인: AI 생성 플래그가 없고 내용이 있으면 관리자 입력으로 간주
            const isManuallySet = !isAiGenerated && !!currentSettings?.pastor_column_content;

            // 월요일(1)이거나, 필수 데이터(암송구절/칼럼)가 하나라도 없는 경우 생성 수행
            const shouldGenerateWeekly = dayOfWeek === 1 || !currentSettings?.today_verse_text || !currentSettings?.pastor_column_content;

            if (shouldGenerateWeekly) {
                console.log(`[Cron] Day ${dayOfWeek}: Generating Weekly Memorization Verse & Pastor Column...`);
                
                // 4. 이번주 암송구절 생성
                const verseRes = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: `성도들이 한 주간 마음속에 새기고 암송할 '이번주 암송구절'을 하나 선정해 주세요. 
핵심적이고 은혜로우며, 암송하기에 문장이 간결하고 아름다운 구절을 권장합니다.
주어진 큐티 본문(${reference})과는 가급적 중복되지 않는 다른 성경의 구절을 선정해 주세요.
반드시 아래 JSON 형식으로만 답하세요:
{"reference":"성경구절(장:절)","verse":"말씀 내용"}`
                        }
                    ],
                    temperature: 0.8,
                });

                const verseContent = verseRes.choices[0]?.message?.content || '';
                const verseJson = JSON.parse(verseContent.match(/\{[\s\S]*\}/)![0]);

                let columnJson = { title: currentSettings?.pastor_column_title || '', content: currentSettings?.pastor_column_content || '' };
                
                // 관리자가 직접 입력하지 않은 경우에만 칼럼 자동 생성
                if (!isManuallySet) {
                    const columnRes = await openai.chat.completions.create({
                        model: 'gpt-4o-mini',
                        messages: [
                            {
                                role: 'system',
                                content: `당신은 교회의 담임목사입니다. 이번주 암송구절 [${verseJson.reference}: ${verseJson.verse}]을 바탕으로 성도들에게 한 주간의 삶에 깊은 위로와 영적 도전을 주는 '목양 칼럼'을 작성해주세요. 

[작성 가이드라인]
1. 분량: 약 500자 내외로 풍성하게 작성하세요.
2. 구조: 말씀의 의미 설명 - 한 주간 삶의 적용점 - 따뜻한 격려와 축복의 순서로 구성하세요.
3. 말투: 성도를 진심으로 아끼는 마음이 담긴 자애롭고 은혜로운 목소리(존댓말)를 사용하세요.
4. 내용: 한 주 동안 성도들이 암송구절을 되새기며 승리할 수 있도록 돕는 실질적인 조언을 포함하세요.

반드시 아래 JSON 형식으로만 답하세요:
{"title":"목양 칼럼: ${verseJson.reference}","content":"내용"}`
                            }
                        ],
                        temperature: 0.7,
                    });

                    const columnContent = columnRes.choices[0]?.message?.content || '';
                    columnJson = JSON.parse(columnContent.match(/\{[\s\S]*\}/)![0]);
                } else {
                    console.log('[Cron] Pastor column is manually set by admin. Skipping AI column generation.');
                }

                // 6. 오늘의 한줄(명언) 생성
                const quoteRes = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: `성도들에게 영감을 줄 수 있는 짧고 강력한 '크리스찬 명언' 또는 '신학자의 한마디'를 생성해 주세요. 
기존 성경 구절과는 다른 깊이 있는 통찰을 주는 내용이어야 합니다.
반드시 아래 JSON 형식으로만 답하세요:
{"quote": "명언 내용 - 저자 또는 출처"}`
                        }
                    ],
                    temperature: 0.9,
                });

                const quoteContent = quoteRes.choices[0]?.message?.content || '';
                const quoteJson = JSON.parse(quoteContent.match(/\{[\s\S]*\}/)![0]);

                // 7. 교회 설정(church_settings) 업데이트
                let newPlan = planStr;
                // 기존 tv_text, tv_ref, column_title, column_content, today_quote, column_ai 제거 후 새로 추가
                newPlan = newPlan.split('|').filter((p: string) => 
                    !p.startsWith('tv_text:') && 
                    !p.startsWith('tv_ref:') && 
                    !p.startsWith('column_title:') && 
                    !p.startsWith('column_content:') &&
                    !p.startsWith('today_quote:') &&
                    !p.startsWith('column_ai:')
                ).join('|');
                
                newPlan += `|tv_text:${encodeURIComponent(verseJson.verse)}`;
                newPlan += `|tv_ref:${encodeURIComponent(verseJson.reference)}`;
                newPlan += `|column_title:${encodeURIComponent(columnJson.title)}`;
                newPlan += `|column_content:${encodeURIComponent(columnJson.content)}`;
                newPlan += `|today_quote:${encodeURIComponent(quoteJson.quote)}`;
                newPlan += `|column_ai:true`;

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

                console.log('[Cron] Weekly Memorization Verse, Pastor Column & Daily Quote updated successfully.');
            } else {
                console.log(`[Cron] Day ${dayOfWeek}: Skipping Weekly Generation (Only on Mondays).`);
            }

        } catch (e) {
            console.error('이번주 암송구절/칼럼 생성 실패:', e);
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

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

// 한국 시간 기준 오늘 날짜 반환
function getKoreaDateString(): string {
    return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
}

// 자동 큐티 생성 로직 (성경 읽기표 기반)
async function generateAutoQt(date: string) {
    const baseReference = getTodayReading(date);

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: `당신은 개혁주의 신학(Reformed Theology)에 입각하여 본문을 해석하는 탁월한 성경 해석가이자, 성도를 깊이 아끼는 따뜻한 목회자입니다. 
성도들이 단순한 본문 읽기를 넘어 그 속에 담긴 하나님의 사랑과 풍성한 영감을 발견할 수 있도록 섬세하고 깊이 있게 해설을 작성해주세요.

[작성 가이드라인]
1. 본문 해설 (Explanation):
   - 성경 본문의 역사적/신학적 배경을 성도가 이해하기 쉽게 이야기하듯 풀어내세요.
   - 본지 핵심 내용을 다룬 뒤, 성도 한 명 한 명에게 개별적으로 심방하여 조언하듯 정성스럽고 풍성하게(10줄 이상) 작성합니다.
   - '~해요', '~해 보세요' 등 부드럽고 따뜻한 경어체를 일관되게 적용하세요.
   - <참고> 또는 <묵상 포인트>와 같이 구분된 형식을 가끔 활용해 깊이를 더하세요.
2. 묵상 질문 (Questions) - 오륜교회 '주만나' 큐티 스타일 반영:
   - 본문의 성경적 흐름과 역사적/문맥적 맥락을 충분히 이해한 깊이 있는 질문이어야 합니다.
   - 성도가 오늘 하루 삶의 자리(가정, 일터, 인간관계, 개인의 연약함이나 성품 등)에서 맞닥뜨리는 실존적인 고민들과 본문의 사건/메시지를 긴밀하게 연결하세요.
   - 내 생각과 방법으로 인생을 통제하거나 해결하려 했던 영역은 무엇인지 돌아보게 하고, 하나님의 성품과 절대 주권을 온전히 신뢰하며 내려놓도록 직면시키는 질문이어야 합니다.
   - 막연하고 추상적인 결단 대신, 오늘 당장 실천할 수 있는 '멈추어야 할 행동'이나 '새롭게 시작해야 할 일' 등 구체적인 적용점을 이끌어내도록 질문을 다듬어 주세요.
3. 마무리 기도문 (Prayer):
   - 본문의 내용이 성도의 삶에 실제로 응축되어 나타날 수 있도록 감성적이고도 진실된 기도문을 작성하세요.

반드시 아래 JSON 형식으로만 답하세요:
{"reference":"확정된 범위","bibleText":"성경 본문 원문","explanation":"본문 해설","question1":"질문1","question2":"질문2","question3":"질문3","prayer":"기도문"}`
                },
                { role: 'user', content: `성경 통독 구절: ${baseReference}` }
            ],
            temperature: 0,
            max_tokens: 2000,
        });

        const content = response.choices[0]?.message?.content || "";
        const qtJson = JSON.parse(content.match(/\{[\s\S]*\}/)![0]);

        const newQt = {
            date,
            reference: qtJson.reference || baseReference,
            passage: `${qtJson.bibleText}|||${qtJson.explanation}`, // 본문과 해설을 |||로 명확히 구분
            question1: qtJson.question1,
            question2: qtJson.question2,
            question3: qtJson.question3,
            prayer: qtJson.prayer,
            ai_generated: true,
        };

        // DB에 저장
        await supabaseAdmin.from('daily_qt').upsert(newQt, { onConflict: 'date' });

        return newQt;
    } catch (err) {
        console.error('Auto QT Generation Error:', err);
        return null;
    }
}

// 오늘 큐티 조회 (수동 등록 본문 우선, 유료 버전 한정 자동 생성)
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || getKoreaDateString();
    const force = searchParams.get('force') === 'true';
    const churchId = searchParams.get('church_id') || '';

    console.log(`[QT API] Request for date: ${date}, force: ${force}, church: ${churchId}`);

    try {
        // 1. force가 아닐 때만 기존 데이터 조회
        if (!force) {
            const { data: manualQt, error: qtError } = await supabaseAdmin
                .from('daily_qt')
                .select('*')
                .eq('date', date)
                .single();

            if (!qtError && manualQt) {
                console.log(`[QT API] Found manual entry for ${date}`);
                return NextResponse.json({ qt: manualQt });
            }
        }

        // 2. 큐티 데이터가 없거나 force인 경우, 교회 설정을 확인
        let { data: settings, error: settingsError } = await supabaseAdmin
            .from('church_settings')
            .select('plan')
            .eq('church_id', churchId)
            .maybeSingle();

        if (!settings) {
            const { data: fallback } = await supabaseAdmin
                .from('church_settings')
                .select('plan')
                .eq('id', 1)
                .single();
            settings = fallback;
        }

        if (settingsError) {
            console.log(`[QT API] Settings not found or error: ${settingsError.message}`);
        }

        // 3. 유료 버전(premium)인 경우 또는 force인 경우 자동 생성 수행
        if (settings?.plan === 'premium' || force) {
            console.log(`[QT API] ${force ? 'Force refresh' : 'Premium plan'} detected. Generating auto QT...`);
            const autoQt = await generateAutoQt(date);
            return NextResponse.json({ qt: autoQt });
        }

        console.log(`[QT API] Free plan or no data for ${date}. Returning fallback.`);
        return NextResponse.json({ qt: null });

    } catch (err: any) {
        console.error(`[QT API] Unexpected Error:`, err);
        return NextResponse.json({ qt: null, error: err.message });
    }
}

// 큐티 저장/수정 (관리자 직접 입력 버전)
export async function POST(req: NextRequest) {
    const body = await req.json();
    const { date, reference, passage, question1, question2, question3, prayer, ai_generated } = body;

    if (!date || !reference || !passage) {
        return NextResponse.json({ success: false, error: '날짜, 성경구절, 본문은 필수입니다.' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
        .from('daily_qt')
        .upsert(
            { date, reference, passage, question1, question2, question3, prayer, ai_generated: ai_generated || false },
            { onConflict: 'date' }
        );

    if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // [푸시 알림] 새로운 큐티 등록 알림 전송 (당일 등록인 경우에만 즉시 발송)
    const today = getKoreaDateString();
    if (date === today) {
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
                                body: `${date} ${reference} 말씀이 등록되었습니다.`,
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
                    actor_name: `${date} ${reference}`,
                    is_read: false
                }));
                await supabaseAdmin.from('notifications').insert(notis);
            }
        } catch (pushErr) {
            console.error('Notification logic error:', pushErr);
        }
    }

    return NextResponse.json({ success: true });
}

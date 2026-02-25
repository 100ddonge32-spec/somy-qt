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
                    content: `당신은 개혁주의 신학(Reformed Theology)에 입각하여 본문을 해석하는 탁월한 성경 해석가이자 큐티 전문가입니다. 요청받은 성경 구절을 바탕으로 성도들이 깊이 있게 묵상할 수 있는 콘텐츠를 생성하세요.

[필수 작성 항목]
1. 실제 범위: 요청받은 기점에서 묵상하기 좋은 정확한 장:절 범위를 판단하세요. (예: "민수기 3:1-13")
2. 성경 본문: 한국어 '개역개정' 버전의 성경 본문을 절 번호와 함께 토씨 하나 틀리지 않고 그대로 적어주세요. 절대 요약하지 마세요.
3. 본문 해설: 개혁주의 신학의 관점(하나님의 주권, 전적인 은혜, 언약 등)을 반영하여 본문의 흐름과 이면에 담긴 영적인 의미를 깊이 있게 해설하세요. 분량은 대략 10줄 내외로 충분하고 풍성하게 작성하며, 단어나 의미 해석에 있어 원어(히브리어/헬라어)의 의미나 성경적 배경 지식이 필요하다면 문단 끝이나 중간에 <참고> 형식으로 괄호를 활용하여 함께 설명해주세요.
4. 묵상 질문 3개: 삶에 적용할 수 있는 깊이 있는 질문
5. 마무리 기도문: 본문의 은혜를 구하는 짧은 기도

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

    console.log(`[QT API] Request for date: ${date}, force: ${force}`);

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
        const { data: settings, error: settingsError } = await supabaseAdmin
            .from('church_settings')
            .select('plan')
            .eq('id', 1)
            .single();

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

    // [푸시 알림] 새로운 큐티 등록 알림 전송
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

    return NextResponse.json({ success: true });
}

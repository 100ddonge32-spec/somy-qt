import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { getTodayReading } from '@/lib/reading-plan';

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
        // 저작권 보호를 위해 성경 본문 자체는 AI로 생성하지 않음!
        // 대신 큐티 본문 범위에 대한 '해설'과 묵상 콘텐츠만 AI가 직접 생성하도록 지시합니다.
        const qtRes = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: `당신은 탁월한 성경 해석가이자 큐티 전문가입니다. 저작권 문제로 성경 본문을 앱에서 직접 제공할 수 없는 성도들을 위해, 그날의 큐티 본문에 대한 깊은 '해설(묵상 포인트)'과 적용 질문을 작성해주세요.

주어진 성경 범위를 바탕으로 다음을 작성하세요:
1. 실제 범위: 주어진 본문의 대략적인 15절 내외의 정확한 장:절 범위를 판단해주세요. (예: "창세기 1:1-15 절")
2. 본문 요약: 실제 성경 본문의 흐름을 알 수 있도록 주요 내용을 3줄 내외로 요약해주세요.
3. 본문 해설: 본문의 이면에 담긴 영적인 의미와 적용점을 3~4문장의 따뜻한 문체로 해설해주세요. (절대 본문을 그대로 적지 마세요)
4. 묵상 질문 3개: 성도의 삶에 울림을 주는 실질적이고 따뜻한 질문
5. 마무리 기도문: 본문의 은혜를 갈구하는 간절한 기도

반드시 아래 JSON 형식으로만 답하세요:
{"actualReference":"실제 범위","passageSummary":"본문 요약","explanation":"본문 해설","question1":"질문1","question2":"질문2","question3":"질문3","prayer":"기도문"}`
                },
                { role: 'user', content: `오늘의 성경구절 기점: ${baseReference}` }
            ],
            temperature: 0.7,
            max_tokens: 1500,
        });

        const qtContent = qtRes.choices[0]?.message?.content || '';
        const qtJson = JSON.parse(qtContent.match(/\{[\s\S]*\}/)![0]);

        const actualReference = qtJson.actualReference || baseReference;

        const newQt = {
            date,
            reference: actualReference,
            passage: `${qtJson.passageSummary}|||${qtJson.explanation}`, // 요약본과 해설을 ||| 구분자로 병합 저장
            question1: qtJson.question1,
            question2: qtJson.question2,
            question3: qtJson.question3,
            prayer: qtJson.prayer,
            ai_generated: true,
        };

        // DB에 저장 (다음 사람을 위해)
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
    return NextResponse.json({ success: true });
}

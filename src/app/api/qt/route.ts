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
    const reference = getTodayReading();

    try {
        // 1. 성경 본문 가져오기 (OpenAI 활용)
        const bibleRes = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `당신은 성경 전문가이자 신중한 목회자입니다. 
주어진 성경 범위(예: 민수기 1-2)에서 묵상에 가장 적합한 **연속된 15~20개 절**을 추출하여 제공하세요. 

**[지시사항]**
1. 절대로 동일한 문장이나 단어를 무한 반복(루프)하지 마세요.
2. 각 절은 성경의 순서대로 자연스럽게 이어져야 합니다.
3. 개역개정판 본문을 정확하게 유지하세요.
4. 반드시 아래 JSON 형식으로만 답하세요:
{"passage":"본문 내용 (줄바꿈은 \\n으로)"}`
                },
                { role: 'user', content: `성경구절: ${reference}` }
            ],
            temperature: 0.4,
            max_tokens: 1500,
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
                    content: `당신은 신중한 목회자이자 큐티 전문가입니다. 성도들이 말씀을 깊이 묵상하고 삶에 적용할 수 있도록 돕습니다.
주어진 성경 본문을 바탕으로:
1. 묵상 질문 3개 (성도의 삶에 울림을 주는 실질적이고 따뜻한 질문)
2. 마무리 기도문 1개 (본문의 은혜를 갈구하는 간절한 기도)

반드시 아래 JSON 형식으로만 답하세요:
{"question1":"질문1","question2":"질문2","question3":"질문3","prayer":"기도문"}`
                },
                { role: 'user', content: `성경구절: ${reference}\n본문:\n${passage}` }
            ],
            temperature: 0.7,
        });

        const qtContent = qtRes.choices[0]?.message?.content || '';
        const qtJson = JSON.parse(qtContent.match(/\{[\s\S]*\}/)![0]);

        const newQt = {
            date,
            reference,
            passage,
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

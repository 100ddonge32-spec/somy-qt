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
        // 1. 성경 본문 가져오기 (OpenAI 활용)
        const bibleRes = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: `당신은 대한민국 성서학자인 동시에 신중한 목회자입니다. 
당신의 유일한 임무는 사용자가 요청한 성경 범위(예: 민수기 1-2)에서 **'성경전서 개역개정판(KRV)'**의 본문을 **단 한 글자의 가감이나 수정 없이 원문 그대로(Verbatim)** 추출하는 것입니다.

**[엄격 준수 사항 - 위반 시 무효]**
1. **요약/의역 금지**: 절대로 내용을 요약하거나 현대어로 풀어서 쓰지 마세요. 성경책에 적힌 텍스트 그대로여야 합니다.
2. **숫자 정확도**: 인구 조사 숫자, 연도, 날짜 등을 절대로 임의로 변경하지 마세요.
3. **분량 조절**: 주어진 범위의 **시작점부터 연속된 약 15~20개 절**을 누락 없이 순서대로 제공하세요.
4. **절 번호 필수**: 각 절의 시작에 반드시 숫자로 절 번호를 기입하세요. (예: 1. 여호와께서... 2. 이스라엘...).
5. **결과 형식**: 당신이 실제로 추출한 **정확한 장:절 범위를 포함**해야 합니다. (예: "민수기 1:1-19 절")

반드시 아래 JSON 형식으로만 답하세요:
{"reference":"정확한 범위 (예: 민수기 1:1-20 절)","passage":"본문 내용 (줄바꿈은 \\n으로)"}`
                },
                { role: 'user', content: `성경구절: ${baseReference}` }
            ],
            temperature: 0,
            max_tokens: 2000,
        });

        const bibleContent = bibleRes.choices[0]?.message?.content || '';
        const bibleJson = JSON.parse(bibleContent.match(/\{[\s\S]*\}/)![0]);
        const passage = bibleJson.passage;
        const actualReference = bibleJson.reference || baseReference;

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
                { role: 'user', content: `성경구절: ${actualReference}\n본문:\n${passage}` }
            ],
            temperature: 0.7,
        });

        const qtContent = qtRes.choices[0]?.message?.content || '';
        const qtJson = JSON.parse(qtContent.match(/\{[\s\S]*\}/)![0]);

        const newQt = {
            date,
            reference: actualReference,
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

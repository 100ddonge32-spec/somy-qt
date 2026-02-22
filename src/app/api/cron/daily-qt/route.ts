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
            max_tokens: 800,
        });

        const qtContent = qtRes.choices[0]?.message?.content || '';
        const qtJson = JSON.parse(qtContent.match(/\{[\s\S]*\}/)![0]);

        // 3. DB에 저장
        const { error } = await supabaseAdmin
            .from('daily_qt')
            .upsert({
                date: today,
                reference,
                passage,
                question1: qtJson.question1,
                question2: qtJson.question2,
                question3: qtJson.question3,
                prayer: qtJson.prayer,
                ai_generated: true,
            }, { onConflict: 'date' });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

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

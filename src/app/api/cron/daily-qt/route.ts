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
                    content: `성경 본문을 개역개정판 기준으로 제공해주세요. JSON 형식으로만 답하세요:
{"passage":"본문 내용 (줄바꿈은 \\n으로)"}`
                },
                { role: 'user', content: `성경구절: ${reference}` }
            ],
            temperature: 0.2,
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
                    content: `큐티 묵상 질문 3개와 마무리 기도문을 작성해주세요.
JSON 형식으로만 답하세요:
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

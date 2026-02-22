import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { reference, passage } = body;

    if (!reference || !passage) {
        return NextResponse.json({ error: '성경 구절과 본문이 필요합니다.' }, { status: 400 });
    }

    try {
        const response = await openai.chat.completions.create({
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
                {
                    role: 'user',
                    content: `성경구절: ${reference}\n본문:\n${passage}`
                }
            ],
            temperature: 0.7,
            max_tokens: 800,
        });

        const content = response.choices[0]?.message?.content || '';

        // JSON 파싱
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return NextResponse.json({ error: 'AI 응답 형식 오류' }, { status: 500 });
        }

        const result = JSON.parse(jsonMatch[0]);
        return NextResponse.json(result);

    } catch (err) {
        console.error('AI QT generation error:', err);
        return NextResponse.json({ error: 'AI 생성 중 오류가 발생했습니다.' }, { status: 500 });
    }
}

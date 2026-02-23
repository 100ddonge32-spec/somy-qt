import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { script } = body;

    if (!script) {
        return NextResponse.json({ error: '설교 원고가 필요합니다.' }, { status: 400 });
    }

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `당신은 탁월한 목회자이자 설교 요약 전문가입니다. 성도들이 말씀을 쉽게 이해하고 깊이 묵상할 수 있도록 돕습니다.
입력된 주일 설교 원고(또는 메모)를 바탕으로 다음을 작성하세요:
1. 설교 요약: 핵심 메시지와 은혜의 포인트를 3~4문장의 따뜻하고 명확한 문단으로 요약해주세요.
2. 나눔 질문 3개: 이 설교를 듣고 소그룹(구역/셀)에서 나누기 좋은, 삶에 적용할 만한 질문 3개를 작성해주세요.

반드시 아래 JSON 형식으로만 답하세요:
{"summary":"요약 내용","question1":"질문1","question2":"질문2","question3":"질문3"}`
                },
                {
                    role: 'user',
                    content: `[설교 원고/메모]\n${script}`
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
        console.error('AI Sermon generation error:', err);
        return NextResponse.json({ error: 'AI 생성 중 오류가 발생했습니다.' }, { status: 500 });
    }
}

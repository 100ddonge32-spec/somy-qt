import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { title } = body;

    if (!title) {
        return NextResponse.json({ error: '책 제목이 필요합니다.' }, { status: 400 });
    }

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `당신은 탁월한 기독교 도서 큐레이터이자 서평가입니다. 성도들이 책을 통해 영적 성장을 이룰 수 있도록 돕습니다.
입력된 책 제목을 바탕으로 다음을 작성하세요:
1. 책 소개: 해당 도서의 핵심 내용과 성도들에게 추천하는 이유를 3~4문장의 따뜻하고 명확한 문단으로 작성해주세요.
2. 기대 효과: 이 책을 읽었을 때 우리가 얻을 수 있는 유익이나 영적 교훈을 한 문장으로 요약해주세요.

반드시 아래 JSON 형식으로만 답하세요:
{"description":"책 소개 내용","benefit":"기대 효과 내용"}`
                },
                {
                    role: 'user',
                    content: `[책 제목]\n${title}`
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
        console.error('AI Book generation error:', err);
        return NextResponse.json({ error: 'AI 생성 중 오류가 발생했습니다.' }, { status: 500 });
    }
}

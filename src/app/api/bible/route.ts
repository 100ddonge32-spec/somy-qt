import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { reference } = body;

    if (!reference) {
        return NextResponse.json({ error: '성경 구절을 입력해주세요.' }, { status: 400 });
    }

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `당신은 성경 본문을 정확하게 제공하는 도우미입니다.
사용자가 성경 구절(예: "시편 23:1-3")을 주면, 해당 성경 본문을 개역개정판(한국어) 기준으로 정확하게 제공하세요.
반드시 아래 JSON 형식으로만 답하세요:
{"passage":"본문 내용 (줄바꿈은 \\n으로)"}`
                },
                {
                    role: 'user',
                    content: `성경구절: ${reference}`
                }
            ],
            temperature: 0.2,
            max_tokens: 1000,
        });

        const content = response.choices[0]?.message?.content || '';
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return NextResponse.json({ error: 'AI 응답 형식 오류' }, { status: 500 });
        }

        const result = JSON.parse(jsonMatch[0]);
        return NextResponse.json(result);

    } catch (err) {
        console.error('Bible fetch error:', err);
        return NextResponse.json({ error: '성경 본문 가져오기 실패' }, { status: 500 });
    }
}

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
                    content: `당신은 성경 전문가이자 신중한 목회자입니다. 
주어진 성경 범위에서 묵상에 가장 적합한 **연속된 15~20개 절**을 추출하여 제공하세요. 

**[지시사항]**
1. 절대로 동일한 문장이나 단어를 무한 반복(루프)하지 마세요.
2. 각 절은 성경의 순서대로 자연스럽게 이어져야 합니다.
3. **각 절의 시작에 반드시 절 번호를 기입하세요 (예: 1. 여호와께서... 2. 이스라엘...).**
4. 개역개정판 본문을 정확하게 유지하세요.
5. 반드시 아래 JSON 형식으로만 답하세요:
{"passage":"본문 내용 (줄바꿈은 \\n으로)"}`
                },
                {
                    role: 'user',
                    content: `성경구절: ${reference}`
                }
            ],
            temperature: 0.4,
            max_tokens: 1500,
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

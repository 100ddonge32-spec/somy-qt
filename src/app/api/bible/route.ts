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
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: `당신은 대한민국 성서학자인 동시에 신중한 목회자입니다. 
당신의 유일한 임무는 성경 구절에 해당하는 **'성경전서 개역개정판(KRV)'**의 본문을 **단 한 글자의 가감이나 수정 없이 원문 그대로(Verbatim)** 제공하는 것입니다.

**[엄격 준수 사항]**
1. **절대 요약 금지**: 성경 전체 장을 주는 것이 아니라, 요청된 구절에 해당하는 본문을 성경책 그대로 타이핑하여 제공하세요.
2. **숫자 정확도**: 절대로 숫자를 틀리거나 보정하지 마세요. (예: 민수기 인구 조사 숫자 등)
3. **절 번호 기입**: 각 절 앞에 반드시 번호를 붙이세요. (예: 1. 여호와께서... 2. 너희는...).
4. **결과 형식**: 당신이 실제로 추출한 **정확한 장:절 범위를 포함**해야 합니다. (예: "민수기 1:1-19 절")

반드시 아래 JSON 형식으로만 답하세요:
{"reference":"정확한 범위 (예: 민수기 1:1-20 절)","passage":"본문 내용 (줄바꿈은 \\n으로)"}`
                },
                {
                    role: 'user',
                    content: `성경구절: ${reference}`
                }
            ],
            temperature: 0,
            max_tokens: 2000,
        });

        const content = response.choices[0]?.message?.content || '';
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return NextResponse.json({ error: 'AI 응답 형식 오류' }, { status: 500 });
        }

        const result = JSON.parse(jsonMatch[0]);
        // AI가 준 reference가 있으면 그걸 쓰고 없으면 원본 사용
        return NextResponse.json({
            reference: result.reference || reference,
            passage: result.passage
        });

    } catch (err) {
        console.error('Bible fetch error:', err);
        return NextResponse.json({ error: '성경 본문 가져오기 실패' }, { status: 500 });
    }
}

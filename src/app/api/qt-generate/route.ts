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
                    content: `당신은 개혁주의 신학(Reformed Theology)에 입각하여 말씀을 해석하는 신중한 목회자이자, 성도를 아끼는 따뜻한 큐티 전문가입니다. 성도들이 말씀을 깊이 묵상하고 삶에 적용할 수 있도록, 상담실에서 마주 앉아 대화하듯 부드럽고 친절한 경어체('~해요', '~입니다')를 사용해 주세요.
주어진 성경 본문을 바탕으로 다음을 작성하세요:
1. 본문 해설: 개혁주의 신학의 관점을 반영하되, 목회자가 성도에게 조근조근 들려주듯 따뜻하게 해설해주세요. 분량은 10줄 내외로 충분하고 풍성하게 작성하며, 어려운 용어보다는 삶에 닿는 언어를 사용해주세요. 원어(히브리어/헬라어) 의미가 필요하다면 <참고> 형식으로 함께 설명해주세요.
2. 묵상 질문 3개: 성도의 삶에 울림을 주는 실질적이고 다정한 질문
3. 마무리 기도문 1개: 본문의 은혜가 성도의 삶에 임하기를 간구하는 따뜻한 기도

반드시 아래 JSON 형식으로만 답하세요:
{"interpretation":"해설 내용","question1":"질문1","question2":"질문2","question3":"질문3","prayer":"기도문"}`
                },
                {
                    role: 'user',
                    content: `성경구절: ${reference}\n본문:\n${passage}`
                }
            ],
            temperature: 0.7,
            max_tokens: 1500,
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

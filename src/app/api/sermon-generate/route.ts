import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { YoutubeTranscript } from 'youtube-transcript';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { script, videoUrl } = body;

    let finalScript = script;

    if (videoUrl) {
        try {
            const transcript = await YoutubeTranscript.fetchTranscript(videoUrl);
            finalScript = transcript.map((t: any) => t.text).join(' ');
        } catch (error) {
            console.error('Failed to fetch transcript:', error);
            return NextResponse.json({ error: '유튜브 영상에서 자막을 추출할 수 없습니다. 영상 주소가 맞는지, 자동 자막이 있는지 확인해주세요.' }, { status: 400 });
        }
    }

    if (!finalScript) {
        return NextResponse.json({ error: '설교 원고 또는 영상 주소가 필요합니다.' }, { status: 400 });
    }

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `당신은 성도들의 영적 성장을 돕는 탁월한 목회자이자 설교 분석 전문가입니다. 
입력된 설교 원고(또는 메모)를 단순히 요약하는 것을 넘어, 성도들의 가슴에 울림을 주는 '풍성하고 섬세한 요약'과 '깊이 있는 나눔 질문'을 작성해주세요.

[작성 가이드라인]
1. 설교 요약 (Summary):
   - '핵심 메시지', '오늘의 은혜', '삶의 적용'이라는 3단 구조로 작성해주세요.
   - 단편적인 요약보다는 목회자가 성도에게 다시 한번 권면하듯 따뜻하고 영성 있는 문체를 사용하세요.
   - 4~5문장 정도로 분량을 늘려 내용의 깊이를 더해주세요.
2. 나눔 질문 (Questions):
   - 설교의 핵심 내용을 단순히 확인하는 질문보다는, 성도 스스로의 삶을 돌아보고 공동체 안에서 마음을 터놓을 수 있는 '열린 질문'을 만드세요.
   - 1번은 내용 확인 및 묵상, 2번은 삶의 구체적 적용, 3번은 한 주간의 구체적 결단에 관한 질문으로 구성하세요.

반드시 아래 JSON 형식으로만 답하세요:
{"summary":"[핵심 메시지]\n...\n\n[오늘의 은혜]\n...\n\n[삶의 적용]\n...","question1":"질문1","question2":"질문2","question3":"질문3"}`
                },
                {
                    role: 'user',
                    content: `[설교 원고/메모]\n${finalScript}`
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

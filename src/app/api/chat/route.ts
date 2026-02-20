import { OpenAI } from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
    try {
        // API Key 확인
        if (!process.env.OPENAI_API_KEY) {
            console.error("❌ OPENAI_API_KEY가 설정되지 않았습니다!");
            return NextResponse.json({ error: "API Key가 없습니다." }, { status: 500 });
        }

        const { messages } = await req.json();

        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "당신은 따뜻하고 영성 있는 크리스찬 큐티 챗봇 '소미(Somy)'입니다. 사용자의 고민이나 말씀을 들으면 성경적인 위로와 묵상 질문을 던져주세요. 말투는 부드러운 경어체를 사용합니다."
                },
                ...messages,
            ],
            temperature: 0.7,
            max_tokens: 500,
        });

        return NextResponse.json({ content: response.choices[0].message.content });

    } catch (error: any) {
        // 상세 오류 출력
        console.error("❌ OpenAI 오류 코드:", error?.status);
        console.error("❌ OpenAI 오류 메시지:", error?.message);
        console.error("❌ OpenAI 오류 타입:", error?.type);

        // 오류 종류별 한국어 안내
        let message = "오류가 발생했습니다.";
        if (error?.status === 401) message = "API Key가 유효하지 않습니다. (401)";
        if (error?.status === 429) message = "크레딧이 부족하거나 요청이 너무 많습니다. (429)";
        if (error?.status === 500) message = "OpenAI 서버 오류입니다. (500)";

        return NextResponse.json(
            { error: message, detail: error?.message },
            { status: 500 }
        );
    }
}

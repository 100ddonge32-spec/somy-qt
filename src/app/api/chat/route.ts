import { OpenAI } from "openai";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

function getKoreaDateString(): string {
    return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
}

export async function POST(req: Request) {
    try {
        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json({ error: "API Key가 없습니다." }, { status: 500 });
        }

        const { messages, church_id: rawChurchId } = await req.json();
        const church_id = rawChurchId || 'demo';

        // [트라이얼 사용량 및 만료 체크]
        if (church_id.startsWith('trial-') || church_id === 'demo') {
            const { data: settings } = await supabaseAdmin.from('church_settings').select('plan').eq('church_id', church_id).maybeSingle();

            if (settings?.plan?.startsWith('trial')) {
                const planStr = settings.plan;
                const expireMatch = planStr.match(/expires:([^|]+)/);
                const usageMatch = planStr.match(/usage:([^|]+)/);
                const limitMatch = planStr.match(/limit:([^|]+)/);

                if (expireMatch) {
                    const expire = new Date(expireMatch[1]);
                    if (new Date() > expire) {
                        return NextResponse.json({ content: "⌛ 체험판 기간이 만료되었습니다. 정규 플랜 전환이 필요해요! 🙏" });
                    }
                }

                if (usageMatch && limitMatch) {
                    const usage = parseInt(usageMatch[1]);
                    const limit = parseInt(limitMatch[1]);
                    if (usage >= limit) {
                        return NextResponse.json({ content: "📢 체험판의 무료 AI 대화 사용량을 모두 소진했습니다. 관리자 센터에서 플랜을 확인해 주세요! ✨" });
                    }

                    // 사용량 1 증가 시킨 후 저장
                    const newPlan = planStr.replace(`usage:${usage}`, `usage:${usage + 1}`);
                    await supabaseAdmin.from('church_settings').update({ plan: newPlan }).eq('church_id', church_id);
                }
            }
        }

        // 오늘 큐티 본문 가져오기
        let qtContext = "";
        try {
            const { data } = await supabaseAdmin
                .from('daily_qt')
                .select('*')
                .eq('date', getKoreaDateString())
                .single();

            if (data) {
                qtContext = `

[오늘의 큐티 본문 정보]
- 날짜: ${data.date}
- 성경구절: ${data.reference}
- 본문: ${data.passage}
- 묵상 질문1: ${data.question1 || '없음'}
- 묵상 질문2: ${data.question2 || '없음'}
- 묵상 질문3: ${data.question3 || '없음'}
- 기도문: ${data.prayer || '없음'}

위 큐티 본문 내용을 참고하여 대화해주세요. 사용자가 오늘 말씀에 대해 물어보면 이 내용을 바탕으로 깊이 있는 묵상을 도와주세요.`;
            }
        } catch {
            // 큐티 데이터 없으면 무시
        }

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `당신은 따뜻하고 영성 있는 크리스찬 큐티 챗봇 '소미(Somy)'입니다. 
소미는 귀여운 양 캐릭터이며, 성도들의 큐티(경건의 시간) 동반자입니다.
사용자의 고민이나 말씀을 들으면 성경적인 위로와 묵상 질문을 던져주세요.
말투는 부드러운 경어체를 사용하고, 이모지를 적절히 사용해주세요.
답변은 너무 길지 않게 3-5문장 정도로 해주세요.${qtContext}`
                },
                ...messages,
            ],
            temperature: 0.7,
            max_tokens: 500,
        });

        return NextResponse.json({ content: response.choices[0].message.content });

    } catch (error: any) {
        console.error("❌ OpenAI 오류:", error?.message);

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

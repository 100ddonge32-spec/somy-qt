import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { getTodayReading } from '@/lib/reading-plan';
import webpush from '@/lib/webpush';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function getKoreaDateString(): string {
    return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
}

export async function GET(req: NextRequest) {
    // Vercel Cron 인증 확인
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        if (process.env.CRON_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    const today = getKoreaDateString();
    const { searchParams } = new URL(req.url);
    const force = searchParams.get('force') === 'true';
    const forceWeekly = searchParams.get('force_weekly') === 'true';

    // 1. 이미 오늘 큐티가 있는지 확인
    const { data: existing } = await supabaseAdmin
        .from('daily_qt')
        .select('*')
        .eq('date', today)
        .maybeSingle();

    let reference = existing?.reference || getTodayReading();
    let passage = existing?.passage?.split('|||')[0] || '';

    try {
        // 2. 오늘의 큐티 본문 생성 (내용이 없거나 force가 true일 때만)
        if (!existing || force) {
            try {
                console.log(`[Cron] Generating Daily QT for ${today}...`);
                const bibleRes = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: `당신은 성경 전문가이자 신중한 목회자입니다. 
주어진 성경 범위(예: 민수기 1-2)에서 묵상에 가장 적합한 **연속된 15~20개 절**을 추출하여 제공하세요. 
1. 절대로 본문의 내용을 요약하거나 현대어로 의역하지 마세요. 반드시 개역개정판의 원문 그대로 제공해야 합니다.
2. 각 절의 시작에 반드시 절 번호를 기입하세요.
{"passage":"본문 내용"}`
                        },
                        { role: 'user', content: `성경구절: ${reference}` }
                    ],
                    temperature: 0,
                });

                const bibleContent = bibleRes.choices[0]?.message?.content || '';
                const bibleJson = JSON.parse(bibleContent.match(/\{[\s\S]*\}/)![0]);
                passage = bibleJson.passage;

                const qtRes = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: `당신은 개혁주의 신학에 입각하여 말씀을 해석하는 목회자입니다.
1. 본문 해설: 개혁주의 신학 관점 반영.
2. 묵상 질문 3개.
3. 마무리 기도문 1개.
{"interpretation":"해설","question1":"질문1","question2":"질문2","question3":"질문3","prayer":"기도문"}`
                        },
                        { role: 'user', content: `성경구절: ${reference}\n본문:\n${passage}` }
                    ],
                    temperature: 0.7,
                });

                const qtContent = qtRes.choices[0]?.message?.content || '';
                const qtJson = JSON.parse(qtContent.match(/\{[\s\S]*\}/)![0]);

                await supabaseAdmin.from('daily_qt').upsert({
                    date: today,
                    reference,
                    passage: `${passage}|||${qtJson.interpretation}`,
                    question1: qtJson.question1,
                    question2: qtJson.question2,
                    question3: qtJson.question3,
                    prayer: qtJson.prayer,
                    ai_generated: true,
                }, { onConflict: 'date' });

                // [알림 안내] 자동 생성된 큐티의 알림은 정해진 시간에 스케줄러(push-scheduler)를 통해 발송됩니다.
                // 중복 발송 방지를 위해 이곳의 즉시 발송 로직은 제거합니다.
            } catch (err) {
                console.error('Daily QT failed:', err);
                if (!forceWeekly) throw err;
            }
        }

        // 3. 주간 컨텐츠 (암송구절/칼럼) 생성
        const now = new Date();
        const dayOfWeek = now.getDay();
        const { data: settings } = await supabaseAdmin.from('church_settings').select('*').eq('id', 1).single();
        
        const shouldGenerateWeekly = dayOfWeek === 1 || dayOfWeek === 4 || !settings?.today_verse_text || forceWeekly;

        if (shouldGenerateWeekly) {
            console.log(`[Cron] Generating Weekly content...`);
            const verseRes = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [{ 
                    role: 'system', 
                    content: `성도들이 한 주간 암송할 '이번주 암송구절'을 선정해 주세요. 
핵심적이고 은혜로우며 암송하기 좋은 구절로 추천해 주세요.
반드시 아래 JSON 형식으로만 답하세요:
{"reference":"성경구절(장:절)","verse":"말씀 내용"}` 
                }],
            });
            const verseJson = JSON.parse(verseRes.choices[0].message.content!.match(/\{[\s\S]*\}/)![0]);

            const themes = [
                "인공지능과 기독교 윤리", "기후 위기와 창조 세계의 보전", "현대인의 외로움과 영적 공동체", 
                "디지털 중독과 마음의 안식", "경제적 불평등 속에서의 나눔", "세대 간의 갈등과 그리스도 안에서의 연합", 
                "정신 건강(우울, 불안)과 신앙의 위로", "저출산 시대와 생명의 소중함", "일터에서의 소명과 그리스도인의 삶", 
                "미디어 홍수 속의 분별력", "정치적 양극화와 성경적 평화", "소비 중심 사회에서의 단순한 삶", 
                "입시 경쟁과 다음 세대의 신앙 교육", "대도시 속의 안식과 예배", "기술 문명과 인간 존엄성", 
                "난민과 이주민을 향한 환대", "고난과 질병 속에서의 소망", "성공주의 복음의 경계와 참된 제자도"
            ];
            const selectedTheme = themes[Math.floor(Math.random() * themes.length)];

            const columnRes = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [{ 
                    role: 'system', 
                    content: `당신은 담임목사의 페르소나를 가진 개혁주의 신학자이자 사회 평론가입니다. 현대 사회에서 이슈가 되고 있는 주제(특히 '${selectedTheme}'와 같은 주제를 참고하거나 그 외 시의성 있는 자유 주제)를 선정하여, 개혁주의 신학의 관점(하나님의 주권, 성경의 권위 등)으로 명쾌하게 풀어내는 칼럼을 작성해주세요. 
[가이드] 800자 내외, 논리적이고 지적이면서도 성도들을 향한 따뜻한 목회적 어조, 주제는 매번 진부하지 않고 신선하면서도 영적으로 깊이 있게 작성하세요.
반드시 아래 JSON 형식으로만 답하세요:
{"title":"[담임목사 칼럼] 주제 제목","content":"내용"}` 
                }],
                temperature: 0.8,
            });
            const columnJson = JSON.parse(columnRes.choices[0].message.content!.match(/\{[\s\S]*\}/)![0]);

            const newPlan = (settings?.plan || '') + `|column_ai:true`; // 단순화된 플래그

            await supabaseAdmin.from('church_settings').update({
                today_verse_text: verseJson.verse,
                today_verse_ref: verseJson.reference,
                pastor_column_title: columnJson.title,
                pastor_column_content: columnJson.content,
                plan: newPlan
            }).eq('id', 1);
        }

        return NextResponse.json({ success: true, date: today });
    } catch (err: any) {
        console.error('Final Cron Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

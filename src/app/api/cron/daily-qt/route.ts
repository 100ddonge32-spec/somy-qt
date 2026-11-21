import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { getTodayReading } from '@/lib/reading-plan';
import {
    fetchCoommiReference,
    fetchGodpeopleBibleText,
    generateQtReflection,
} from '@/lib/qt-sync';

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

    const { searchParams } = new URL(req.url);
    const today = searchParams.get('date') || getKoreaDateString();
    const force = searchParams.get('force') === 'true';
    const forceWeekly = searchParams.get('force_weekly') === 'true';

    // 1. 이미 오늘 큐티가 있는지 확인
    const { data: existing } = await supabaseAdmin
        .from('daily_qt')
        .select('*')
        .eq('date', today)
        .maybeSingle();

    let reference = existing?.reference || '';
    let passage = existing?.passage?.split('|||')[0] || '';

    try {
        // 2. 오늘의 큐티 본문 생성 (꿈미 coommi.org 구절 + 갓피플 cnts.godpeople.com 개역개정 본문 + AI 해설)
        if (!existing || force) {
            try {
                console.log(`[Cron] Generating Daily QT for ${today} via Coommi & Godpeople...`);
                const coommiRes = await fetchCoommiReference(today);
                const rawRef = coommiRes.reference || getTodayReading(today);

                const bibleRes = await fetchGodpeopleBibleText(rawRef);
                reference = bibleRes.reference || rawRef;
                passage = bibleRes.passage;

                const qtJson = await generateQtReflection(reference, passage);

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

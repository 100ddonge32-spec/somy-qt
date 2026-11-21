import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
    fetchCoommiReference,
    fetchGodpeopleBibleText,
    generateQtReflection,
} from '@/lib/qt-sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

function getKoreaDateString(): string {
    return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
}

/**
 * 꿈미(coommi.org) 구절 확인 + 갓피플(cnts.godpeople.com) 개역개정 본문 추출 + AI 해설/질문/기도문 원클릭 생성 API
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const date = body.date || getKoreaDateString();
        const coommiUrl = body.coommiUrl || undefined;
        const manualReference = body.reference?.trim() || undefined;
        const forceCoommi = body.forceCoommi === true;
        const includeReflection = body.includeReflection !== false;
        const saveToDb = body.saveToDb === true;

        // 1. 꿈미에서 오늘(또는 지정일)의 성경 구절 가져오기
        let reference = forceCoommi ? undefined : manualReference;
        let coommiSourceUrl = coommiUrl || '';
        let fromCoommi = false;

        if (!reference) {
            const coommiResult = await fetchCoommiReference(date, coommiUrl);
            if (coommiResult.reference) {
                reference = coommiResult.reference;
                coommiSourceUrl = coommiResult.sourceUrl;
                fromCoommi = coommiResult.fromCoommi;
            }
        }

        // 만약 꿈미 사이트에서 해당 날짜 구절을 찾지 못했고 사용자가 수동 입력한 구절이 있다면 그것 사용
        if (!reference && manualReference) {
            reference = manualReference;
        }

        // 주의: 통독표(다니엘 11-12 등)로 임의 폴백하지 않고 명확히 안내
        if (!reference) {
            return NextResponse.json(
                {
                    error: `꿈미(coommi.org) 게시판에서 [${date}] 날짜의 게시글을 아직 찾을 수 없습니다. 게시글이 등록되었는지 확인하거나 성경 구절을 직접 입력해 주세요.`,
                },
                { status: 404 }
            );
        }

        // 2. 갓피플 성경(godpick.godpeople.com / cnts.godpeople.com)에서 실제 개역개정 원문 가져오기
        const bibleResult = await fetchGodpeopleBibleText(reference);
        const finalReference = bibleResult.reference || reference;
        const passage = bibleResult.passage;

        if (!passage) {
            return NextResponse.json(
                { error: `갓피플에서 개역개정 성경 본문(${finalReference})을 가져오지 못했습니다.` },
                { status: 500 }
            );
        }

        // 3. 해설/질문/기도문 생성 여부
        let reflection = {
            interpretation: '',
            question1: '',
            question2: '',
            question3: '',
            prayer: '',
        };

        if (includeReflection) {
            reflection = await generateQtReflection(finalReference, passage);
        }

        // 4. DB 자동 저장 옵션이 켜져 있을 때
        if (saveToDb && includeReflection) {
            const dbRecord = {
                date,
                reference: finalReference,
                passage: `${passage}|||${reflection.interpretation}`,
                question1: reflection.question1,
                question2: reflection.question2,
                question3: reflection.question3,
                prayer: reflection.prayer,
                ai_generated: true,
            };
            const { error: upsertError } = await supabaseAdmin
                .from('daily_qt')
                .upsert(dbRecord, { onConflict: 'date' });

            if (upsertError) {
                throw upsertError;
            }
        }

        return NextResponse.json({
            success: true,
            date,
            reference: finalReference,
            passage,
            interpretation: reflection.interpretation,
            question1: reflection.question1,
            question2: reflection.question2,
            question3: reflection.question3,
            prayer: reflection.prayer,
            meta: {
                fromCoommi,
                coommiSourceUrl,
                fromGodpeople: bibleResult.fromGodpeople,
                godpeopleUrl: bibleResult.godpeopleUrl,
                savedToDb: saveToDb && includeReflection,
            },
        });
    } catch (err: any) {
        console.error('[QT Auto-Fetch Error]:', err);
        return NextResponse.json(
            { error: err.message || '큐티 자동 불러오기 중 오류가 발생했습니다.' },
            { status: 500 }
        );
    }
}

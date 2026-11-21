import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getTodayReading } from '@/lib/reading-plan';
import {
    fetchCoommiReference,
    fetchGodpeopleBibleText,
    generateQtReflection,
} from '@/lib/qt-sync';
import webpush from '@/lib/webpush';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

// 한국 시간 기준 오늘 날짜 반환
function getKoreaDateString(): string {
    return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
}

// 자동 큐티 생성 로직 (꿈미 coommi.org 구절 + 갓피플 개역개정 원문 + AI 해설/질문/기도문)
async function generateAutoQt(date: string) {
    try {
        // 1. 꿈미에서 해당 날짜 성경 구절 확인 (실패 시 기본 읽기표 폴백)
        const coommiRes = await fetchCoommiReference(date);
        const rawReference = coommiRes.reference || getTodayReading(date);

        // 2. 갓피플 성경에서 개역개정 원문 추출
        const bibleRes = await fetchGodpeopleBibleText(rawReference);
        const finalReference = bibleRes.reference || rawReference;
        const bibleText = bibleRes.passage;

        if (!bibleText) {
            throw new Error('개역개정 본문 추출 실패');
        }

        // 3. 개혁주의/주만나 스타일 해설, 질문 3개, 기도문 생성
        const qtReflection = await generateQtReflection(finalReference, bibleText);

        const newQt = {
            date,
            reference: finalReference,
            passage: `${bibleText}|||${qtReflection.interpretation}`, // 본문과 해설을 |||로 명확히 구분
            question1: qtReflection.question1,
            question2: qtReflection.question2,
            question3: qtReflection.question3,
            prayer: qtReflection.prayer,
            ai_generated: true,
        };

        // DB에 저장
        await supabaseAdmin.from('daily_qt').upsert(newQt, { onConflict: 'date' });

        return newQt;
    } catch (err) {
        console.error('Auto QT Generation Error:', err);
        return null;
    }
}

// 오늘 큐티 조회 (수동 등록 본문 우선, 유료 버전 한정 자동 생성)
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || getKoreaDateString();
    const force = searchParams.get('force') === 'true';
    const churchId = searchParams.get('church_id') || '';
    const isStatusList = searchParams.get('status_list') === 'true';
    const isCheckOnly = searchParams.get('check_only') === 'true';

    // 0-1. 기간별 큐티 등록 상태 목록 조회 (자동생성 없이 순수 조회)
    if (isStatusList) {
        try {
            const startDate = searchParams.get('startDate') || getKoreaDateString();
            const endDate = searchParams.get('endDate');

            let query = supabaseAdmin
                .from('daily_qt')
                .select('date, reference, ai_generated, created_at')
                .gte('date', startDate);

            if (endDate) {
                query = query.lte('date', endDate);
            }

            const { data, error } = await query.order('date', { ascending: true });
            if (error) {
                console.error('[QT API] status_list fetch error:', error);
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            return NextResponse.json({ list: data || [] });
        } catch (err: any) {
            console.error('[QT API] status_list exception:', err);
            return NextResponse.json({ error: err.message }, { status: 500 });
        }
    }

    // 0-2. 특정 날짜 등록 여부 및 데이터 단건 확인 (자동생성 절대 안 함)
    if (isCheckOnly) {
        try {
            const { data, error } = await supabaseAdmin
                .from('daily_qt')
                .select('*')
                .eq('date', date)
                .maybeSingle();

            if (error) {
                console.error('[QT API] check_only fetch error:', error);
                return NextResponse.json({ isUploaded: false, qt: null, error: error.message }, { status: 500 });
            }

            return NextResponse.json({ isUploaded: !!data, qt: data || null });
        } catch (err: any) {
            console.error('[QT API] check_only exception:', err);
            return NextResponse.json({ isUploaded: false, qt: null, error: err.message }, { status: 500 });
        }
    }

    console.log(`[QT API] Request for date: ${date}, force: ${force}, church: ${churchId}`);

    try {
        // 1. force가 아닐 때만 기존 데이터 조회
        if (!force) {
            const { data: manualQt, error: qtError } = await supabaseAdmin
                .from('daily_qt')
                .select('*')
                .eq('date', date)
                .single();

            if (!qtError && manualQt) {
                console.log(`[QT API] Found manual entry for ${date}`);
                return NextResponse.json({ qt: manualQt });
            }
        }

        // 2. 큐티 데이터가 없거나 force인 경우, 교회 설정을 확인
        let { data: settings, error: settingsError } = await supabaseAdmin
            .from('church_settings')
            .select('plan')
            .eq('church_id', churchId)
            .maybeSingle();

        if (!settings) {
            const { data: fallback } = await supabaseAdmin
                .from('church_settings')
                .select('plan')
                .eq('id', 1)
                .single();
            settings = fallback;
        }

        if (settingsError) {
            console.log(`[QT API] Settings not found or error: ${settingsError.message}`);
        }

        // 3. 유료 버전(premium)인 경우 또는 force인 경우 자동 생성 수행
        if (settings?.plan === 'premium' || force) {
            console.log(`[QT API] ${force ? 'Force refresh' : 'Premium plan'} detected. Generating auto QT...`);
            const autoQt = await generateAutoQt(date);
            return NextResponse.json({ qt: autoQt });
        }

        console.log(`[QT API] Free plan or no data for ${date}. Returning fallback.`);
        return NextResponse.json({ qt: null });

    } catch (err: any) {
        console.error(`[QT API] Unexpected Error:`, err);
        return NextResponse.json({ qt: null, error: err.message });
    }
}

// 큐티 저장/수정 (관리자 직접 입력 버전)
export async function POST(req: NextRequest) {
    const body = await req.json();
    const { date, reference, passage, question1, question2, question3, prayer, ai_generated } = body;

    if (!date || !reference || !passage) {
        return NextResponse.json({ success: false, error: '날짜, 성경구절, 본문은 필수입니다.' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
        .from('daily_qt')
        .upsert(
            { date, reference, passage, question1, question2, question3, prayer, ai_generated: ai_generated || false },
            { onConflict: 'date' }
        );

    if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // [푸시 알림] 새로운 큐티 등록 알림 전송 (당일 등록인 경우에만 즉시 발송)
    const today = getKoreaDateString();
    if (date === today) {
        try {
            const { data: subscriptions } = await supabaseAdmin
                .from('push_subscriptions')
                .select('user_id, subscription');

            if (subscriptions && subscriptions.length > 0) {
                await Promise.all(subscriptions.map(async (sub) => {
                    if (sub.subscription) {
                        try {
                            const payload = JSON.stringify({
                                title: '📖 오늘의 큐티가 도착했습니다!',
                                body: `${date} ${reference} 말씀이 등록되었습니다.`,
                                url: '/',
                                userId: sub.user_id
                            });
                            await webpush.sendNotification(sub.subscription, payload);
                        } catch (e) { }
                    }
                }));
            }

            // [DB 알림] 모든 사용자에게 알림 저장
            const { data: profiles } = await supabaseAdmin.from('profiles').select('id');
            if (profiles && profiles.length > 0) {
                const notis = profiles.map(p => ({
                    user_id: p.id,
                    type: 'qt',
                    actor_name: `${date} ${reference}`,
                    is_read: false
                }));
                await supabaseAdmin.from('notifications').insert(notis);
            }
        } catch (pushErr) {
            console.error('Notification logic error:', pushErr);
        }
    }

    return NextResponse.json({ success: true });
}

// 큐티 삭제 (관리자용)
export async function DELETE(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');

    if (!date) {
        return NextResponse.json({ success: false, error: '삭제할 날짜가 필요합니다.' }, { status: 400 });
    }

    try {
        const { error } = await supabaseAdmin
            .from('daily_qt')
            .delete()
            .eq('date', date);

        if (error) {
            console.error('[QT API] DELETE error:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[QT API] DELETE exception:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

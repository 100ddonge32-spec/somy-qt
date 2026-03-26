import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from '@/lib/webpush';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

// [표준화] 교회 식별자 정규화
const normalizeId = (id: string | null) => {
    if (!id) return null;
    const s = id.toLowerCase().trim();
    if (s === '예수인교회' || s === 'jesus-in' || s === '예수인') return 'jesus-in';
    return s;
};

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const secret = searchParams.get('secret');

        // 보안 체크 (Vercel Cron Secret 또는 커스텀 시크릿)
        const CRON_SECRET = process.env.CRON_SECRET || 'somy-push-secret-123';
        if (secret !== CRON_SECRET && req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. 현재 한국 시간 구하기 (UTC+9)
        const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
        const currentHour = now.getHours();
        const today = now.toISOString().split('T')[0];

        console.log(`[Push-Scheduler] Checking notifications for ${today} ${currentHour}:00 KST`);

        // 2. 모든 교회 설정 가져오기
        const { data: churches, error: churchError } = await supabaseAdmin
            .from('church_settings')
            .select('*');

        if (churchError) throw churchError;

        const results = [];

        for (const church of churches) {
            let targetHour = 8; // 기본값 8시
            
            // qt_notification_time 필드 또는 plan 필드 파싱
            let configTime = church.qt_notification_time;
            if (!configTime && church.plan && church.plan.includes('qt_time:')) {
                const match = church.plan.match(/qt_time:([^|]+)/);
                if (match) configTime = decodeURIComponent(match[1]);
            }

            if (configTime) {
                const hourPart = configTime.split(':')[0];
                targetHour = parseInt(hourPart, 10);
            }

            // 현재 시간이 설정된 시간(시간 단위)과 일치하는지 확인
            if (currentHour === targetHour) {
                console.log(`[Push-Scheduler] Triggering push for church: ${church.church_id} (Config Time: ${configTime || '08:00'})`);
                
                try {
                    // 해당 교회의 푸시 발송 로직 실행
                    const pushResult = await triggerPushForChurch(church.church_id, today);
                    results.push({ church_id: church.church_id, status: 'success', ...pushResult });
                } catch (err: any) {
                    console.error(`[Push-Scheduler] Failed for ${church.church_id}:`, err.message);
                    results.push({ church_id: church.church_id, status: 'failed', error: err.message });
                }
            }
        }

        return NextResponse.json({
            success: true,
            currentTime: `${currentHour}:00`,
            processedCount: results.length,
            details: results
        });

    } catch (err: any) {
        console.error('[Push-Scheduler Critical Error]', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

async function triggerPushForChurch(churchId: string, today: string) {
    // 1. 해당 교회의 오늘 날짜 큐티 정보 가져오기
    const { data: qtData } = await supabaseAdmin
        .from('daily_qt')
        .select('reference')
        .eq('date', today)
        .eq('church_id', churchId)
        .maybeSingle();

    // 혹시라도 개별 교회 큐티가 없으면 공용(예수인교회 등) 큐티가 있는지 확인 (폴백)
    let reference = qtData?.reference;
    if (!reference) {
        const { data: globalQt } = await supabaseAdmin
            .from('daily_qt')
            .select('reference')
            .eq('date', today)
            .maybeSingle();
        reference = globalQt?.reference;
    }

    const messageTitle = '오늘의 큐티말씀이 도착했습니다 🐑';
    const messageBody = reference ? `오늘의 본문: ${reference}` : '오늘의 말씀을 묵상하며 하루를 시작해 보세요.';

    // 2. 해당 교회의 승인된 성도님들 가져오기
    const { data: approvedProfiles } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('church_id', churchId)
        .eq('is_approved', true);

    const approvedIds = (approvedProfiles || []).map(p => p.id);
    if (approvedIds.length === 0) return { sentCount: 0, reason: 'No approved members' };

    // 3. 구독 정보 가져오기
    const { data: subscriptions } = await supabaseAdmin
        .from('push_subscriptions')
        .select('user_id, subscription')
        .in('user_id', approvedIds);

    if (!subscriptions || subscriptions.length === 0) return { sentCount: 0, reason: 'No subscriptions' };

    // 4. 발송
    const sendResults = await Promise.allSettled(
        subscriptions.map(async (sub) => {
            await webpush.sendNotification(
                sub.subscription,
                JSON.stringify({
                    title: messageTitle,
                    body: messageBody,
                    url: '/?view=qt'
                })
            );
        })
    );

    const sentCount = sendResults.filter(r => r.status === 'fulfilled').length;
    return { sentCount, total: subscriptions.length };
}

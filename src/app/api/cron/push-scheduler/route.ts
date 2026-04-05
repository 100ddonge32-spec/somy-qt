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
        const targetChurchId = searchParams.get('church_id');
        const force = searchParams.get('force') === 'true';

        // 보안 체크 (Vercel Cron Secret 또는 커스텀 시크릿)
        const CRON_SECRET = process.env.CRON_SECRET || 'somy-push-secret-123';
        if (secret !== CRON_SECRET && req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. 현재 한국 시간 구하기 (UTC+9)
        const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
        const currentHour = now.getHours();
        const today = now.toISOString().split('T')[0];

        console.log(`[Push-Scheduler] Request received. TargetChurch: ${targetChurchId || 'ALL'}, Force: ${force}, Time: ${today} ${currentHour}:00 KST`);

        const results = [];

        if (targetChurchId) {
            // 특정 교회만 발송 (기존 push-send-daily 역할 대체)
            console.log(`[Push-Scheduler] Manual trigger for church: ${targetChurchId}`);
            const pushResult = await triggerPushForChurch(targetChurchId, today);
            results.push({ church_id: targetChurchId, status: 'success', ...pushResult });
        } else {
            // 모든 교회 설정 가져오기 (자동 스케줄링)
            const { data: churches, error: churchError } = await supabaseAdmin
                .from('church_settings')
                .select('*');

            if (churchError) throw churchError;

            // Hobby 플랜의 10초 타임아웃을 고려하여 병렬 처리 시도 (단, 너무 많으면 부하 조절 필요)
            // 현재는 서비스 규모가 작으므로 한꺼번에 실행
            const taskPromises = churches.map(async (church) => {
                let targetHour = 8; // 기본값 8시
                
                let configTime = church.qt_notification_time;
                if (!configTime && church.plan && church.plan.includes('qt_time:')) {
                    const match = church.plan.match(/qt_time:([^|]+)/);
                    if (match) configTime = decodeURIComponent(match[1]);
                }

                if (configTime) {
                    const hourPart = configTime.split(':')[0];
                    targetHour = parseInt(hourPart, 10);
                }

                if (currentHour === targetHour || force) {
                    try {
                        return await triggerPushForChurch(church.church_id, today);
                    } catch (err: any) {
                        return { church_id: church.church_id, status: 'failed', error: err.message };
                    }
                }
                return null;
            });

            const settledResults = await Promise.all(taskPromises);
            results.push(...settledResults.filter(Boolean));
        }

        return NextResponse.json({
            success: true,
            today,
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
    const normChurchId = normalizeId(churchId) || churchId;
    
    // 1. 해당 교회의 오늘 날짜 큐티 정보 가져오기
    let churchIdsToSearch = [churchId];
    if (normChurchId === 'jesus-in') {
        churchIdsToSearch = ['jesus-in', '예수인교회', '예수인'];
    }

    const { data: qtData } = await supabaseAdmin
        .from('daily_qt')
        .select('reference')
        .eq('date', today)
        .in('church_id', churchIdsToSearch)
        .maybeSingle();

    // 폴백: 공용 큐티 확인
    let reference = qtData?.reference;
    if (!reference) {
        const { data: globalQt } = await supabaseAdmin
            .from('daily_qt')
            .select('reference')
            .eq('date', today)
            .eq('church_id', 'jesus-in')
            .maybeSingle();
        reference = globalQt?.reference;
    }

    const messageTitle = '오늘의 큐티말씀이 도착했습니다 🐑';
    const messageBody = reference ? `오늘의 본문: ${reference}` : '오늘의 말씀을 묵상하며 하루를 시작해 보세요.';

    // 2. 해당 교회의 승인된 성도님들 가져오기
    const { data: approvedProfiles } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .in('church_id', churchIdsToSearch)
        .eq('is_approved', true);

    const approvedIds = (approvedProfiles || []).map(p => p.id);
    if (approvedIds.length === 0) return { church_id: churchId, sentCount: 0, reason: 'No approved members' };

    // 3. 구독 정보 가져오기
    const { data: subscriptions } = await supabaseAdmin
        .from('push_subscriptions')
        .select('user_id, subscription')
        .in('user_id', approvedIds);

    if (!subscriptions || subscriptions.length === 0) return { church_id: churchId, sentCount: 0, reason: 'No subscriptions' };

    // 4. 발송 및 관리 (무결성 체크 포함)
    const sendResults = await Promise.allSettled(
        subscriptions.map(async (sub) => {
            try {
                await webpush.sendNotification(
                    sub.subscription,
                    JSON.stringify({
                        title: messageTitle,
                        body: messageBody,
                        url: '/?view=qt'
                    })
                );
            } catch (err: any) {
                const statusCode = err.statusCode || (err.response && err.response.statusCode);
                // 만료된 구독 정보 삭제 (Hobby 플랜 효율성 및 데이터 정리)
                if (statusCode === 410 || statusCode === 404 || statusCode === 400) {
                    await supabaseAdmin
                        .from('push_subscriptions')
                        .delete()
                        .eq('user_id', sub.user_id);
                }
                throw err;
            }
        })
    );

    const sentCount = sendResults.filter(r => r.status === 'fulfilled').length;
    return { church_id: churchId, sentCount, total: subscriptions.length };
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

// VAPID 설정
webpush.setVapidDetails(
    'mailto:pastorbaek@kakao.com',
    'BCpTn0SHIYSZzjST5xxL1Cv9svmlp3f9Xmvt9FSALBvo4QwLQCBlo_mu4ThoMHgINRmAk4c9sxwVwI2QtDyHr1I',
    'LAAS6aJenIKYBShIGZsWVKhXNOMKwkuXvpf2NLCGZAI'
);

export async function GET(req: NextRequest) {
    try {
        // 보안을 위한 간단한 시크릿 체크 (헤더나 쿼리스트링)
        const { searchParams } = new URL(req.url);
        const secret = searchParams.get('secret');
        if (secret !== 'somy-push-secret-123') { // 실제 운영시는 더 복잡한 키 권장
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. 오늘 날짜의 큐티 제목 가져오기
        const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
        const { data: qtData } = await supabaseAdmin
            .from('daily_qt')
            .select('reference')
            .eq('date', today)
            .single();

        const messageTitle = '오늘의 큐티말씀이 도착했습니다 🐑';
        const messageBody = qtData ? `오늘의 본문: ${qtData.reference}` : '오늘의 말씀을 묵상하며 하루를 시작해 보세요.';

        // 2. 승인된 성도님들의 ID 목록 먼지 가져오기
        const { data: approvedProfiles, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('is_approved', true);

        if (profileError) throw profileError;

        const approvedIds = (approvedProfiles || []).map(p => p.id);

        if (approvedIds.length === 0) {
            return NextResponse.json({ success: true, sentCount: 0, failedCount: 0, totalApprovedCount: 0 });
        }

        // 3. 승인된 성도님들의 구독 정보만 가져오기
        const { data: subscriptions, error: subError } = await supabaseAdmin
            .from('push_subscriptions')
            .select('user_id, subscription')
            .in('user_id', approvedIds);

        if (subError) throw subError;

        if (!subscriptions || subscriptions.length === 0) {
            return NextResponse.json({ success: true, sentCount: 0, failedCount: 0, totalApprovedCount: approvedIds.length });
        }

        const results = await Promise.allSettled(
            subscriptions.map(async (sub, idx) => {
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

                    // 410 (Gone) or 404 (Not Found) means the subscription has expired or is no longer valid
                    if (statusCode === 410 || statusCode === 404) {
                        console.log(`[Push] Deleting expired subscription for user: ${sub.user_id}`);
                        await supabaseAdmin
                            .from('push_subscriptions')
                            .delete()
                            .eq('user_id', sub.user_id);
                    } else {
                        console.error(`[Push Error] Index ${idx} (User: ${sub.user_id}):`, err.message);
                    }
                    throw err; // For Promise.allSettled
                }
            })
        );

        const sentCount = results.filter(r => r.status === 'fulfilled').length;
        const rejected = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[];
        const failedCount = rejected.length;

        // 에러 상세 메시지 수집 (친절한 언어로 번역 및 중복 제거)
        const errorMessages = Array.from(new Set(rejected.map(r => {
            const err = r.reason;
            const statusCode = err.statusCode || (err.response && err.response.statusCode);
            if (statusCode === 410 || statusCode === 404) {
                return '만료되거나 취소된 알림 설정';
            }
            if (err.message && err.message.includes('unexpected response code')) {
                return '브라우저 응답 오류';
            }
            return err.message || '알 수 없는 오류';
        })));

        return NextResponse.json({
            success: true,
            sentCount,
            failedCount,
            totalApprovedCount: approvedIds.length,
            errorSamples: errorMessages.slice(0, 3),
            today
        });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

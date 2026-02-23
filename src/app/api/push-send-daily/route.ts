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

        // 2. 모든 구독자 정보 가져오기
        const { data: subscriptions } = await supabaseAdmin
            .from('push_subscriptions')
            .select('subscription');

        if (!subscriptions || subscriptions.length === 0) {
            return NextResponse.json({ success: true, sentCount: 0 });
        }

        // 3. 알림 전송
        const results = await Promise.allSettled(
            subscriptions.map(sub =>
                webpush.sendNotification(
                    sub.subscription,
                    JSON.stringify({
                        title: messageTitle,
                        body: messageBody,
                        url: '/?view=qt'
                    })
                )
            )
        );

        const sentCount = results.filter(r => r.status === 'fulfilled').length;
        const failedCount = results.filter(r => r.status === 'rejected').length;

        return NextResponse.json({
            success: true,
            sentCount,
            failedCount,
            today
        });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

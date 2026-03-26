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
        // 보안을 위한 간단한 시크릿 체크 (헤더나 쿼리스트링)
        const { searchParams } = new URL(req.url);
        const secret = searchParams.get('secret');
        const churchId = searchParams.get('church_id') || 'jesus-in'; // 기본값 본교회

        if (secret !== 'somy-push-secret-123') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. 해당 교회의 오늘 날짜 큐티 제목 가져오기
        const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
        const normChurchId = normalizeId(churchId) || 'jesus-in';
        
        let churchIdsToSearch = [churchId]; // 기본적으로 현재 접속한 ID 사용
        if (normChurchId === 'jesus-in') {
            churchIdsToSearch = ['jesus-in', '예수인교회', '예수인'];
        }

        const { data: qtData } = await supabaseAdmin
            .from('daily_qt')
            .select('reference')
            .eq('date', today)
            .in('church_id', churchIdsToSearch)
            .maybeSingle();

        const messageTitle = '오늘의 큐티말씀이 도착했습니다 🐑';
        const messageBody = qtData ? `오늘의 본문: ${qtData.reference}` : '오늘의 말씀을 묵상하며 하루를 시작해 보세요.';

        // 2. 해당 교회의 승인된 성도님들의 ID 목록만 가져오기 (교회간 간섭 방지)
        const { data: approvedProfiles, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .in('church_id', churchIdsToSearch)
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

                    // 410 (Gone), 404 (Not Found), or 400 (Bad Request - typically VAPID mismatch)
                    if (statusCode === 410 || statusCode === 404 || statusCode === 400) {
                        console.log(`[Push] Deleting invalid/expired subscription for user: ${sub.user_id} (Status: ${statusCode})`);
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
            const err = r.reason || {};
            const statusCode = err.statusCode || (err.response && err.response.statusCode);
            if (statusCode) {
                if (statusCode === 410 || statusCode === 404) return '만료되거나 취소된 알림 설정';
                if (statusCode === 401 || statusCode === 403) return `VAPID 키 설정 오류 (상태코드: ${statusCode})`;
                return `브라우저/푸시서비스 응답 오류 (상태코드: ${statusCode})`;
            }
            return err.message || '알 수 없는 네트워크 오류';
        })));

        return NextResponse.json({
            success: true,
            sentCount,
            failedCount,
            totalApprovedCount: approvedIds.length,
            totalSubscriptionsFound: subscriptions.length,
            churchIdsSearched: churchIdsToSearch,
            errorSamples: errorMessages.slice(0, 3),
            today
        });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

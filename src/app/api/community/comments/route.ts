import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

// VAPID 설정 (환경변수 권장)
webpush.setVapidDetails(
    'mailto:pastorbaek@kakao.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BCpTn0SHIYSZzjST5xxL1Cv9svmlp3f9Xmvt9FSALBvo4QwLQCBlo_mu4ThoMHgINRmAk4c9sxwVwI2QtDyHr1I',
    process.env.VAPID_PRIVATE_KEY || 'LAAS6aJenIKYBShIGZsWVKhXNOMKwkuXvpf2NLCGZAI'
);

// 댓글 작성 및 알림 생성
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { post_id, user_id, user_name, content } = body;

        // 1. 댓글 삽입
        const { data: comment, error: commentError } = await supabaseAdmin
            .from('community_comments')
            .insert([{ post_id, user_id, user_name, content }])
            .select()
            .single();

        if (commentError) throw commentError;

        // 2. 게시글 작성자 찾기 (알림을 보내기 위함)
        const { data: post, error: postError } = await supabaseAdmin
            .from('community_posts')
            .select('user_id')
            .eq('id', post_id)
            .single();

        // 3. 알림 생성 및 푸시 전송 (자신이 쓴 댓글은 알림 제외)
        if (!postError && post && post.user_id !== user_id) {
            // DB 알림 저장
            await supabaseAdmin
                .from('notifications')
                .insert([{
                    user_id: post.user_id, // 받는 사람 (원글 작성자)
                    actor_name: user_name, // 행위자 (댓글 작성자)
                    type: 'comment',
                    post_id: post_id,
                    is_read: false
                }]);

            // [푸시 알림] 받는 사람의 구독 정보 가져오기
            const { data: subsData } = await supabaseAdmin
                .from('push_subscriptions')
                .select('subscription')
                .eq('user_id', post.user_id);

            if (subsData && subsData.length > 0) {
                for (const sub of subsData) {
                    if (!sub.subscription) continue;
                    try {
                        const pushPayload = JSON.stringify({
                            title: '🔔 새로운 댓글이 달렸어요!',
                            body: `${user_name}님이 성도님의 은혜나눔에 댓글을 남기셨습니다.`,
                            url: '/?view=community'
                        });
                        await webpush.sendNotification(sub.subscription, pushPayload);
                        console.log('Push Notification Sent Success');
                    } catch (pushErr) {
                        console.error('Push Notification Send Failed:', pushErr);
                    }
                }
            }
        }

        return NextResponse.json(comment);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const body = await req.json();
        const { id } = body;

        if (!id) return NextResponse.json({ error: 'Comment ID is required' }, { status: 400 });

        const { error } = await supabaseAdmin
            .from('community_comments')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

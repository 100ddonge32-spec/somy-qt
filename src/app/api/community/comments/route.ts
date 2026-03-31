import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from '@/lib/webpush';
import { logActivity } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);



// 댓글 작성 및 알림 생성
export async function POST(req: NextRequest) {
    try {
// 1. 댓글 삽입
        const body = await req.json();
        const { post_id, user_id, user_name, content, is_private, parent_id } = body;

        // [이름 복원] user_name이 숫자로 오거나 비어있는 경우 DB 프로필에서 성함 조회
        let finalUserName = user_name;
        if (!finalUserName || /^[0-9]+$/.test(String(finalUserName)) || String(finalUserName).length > 20) {
            const { data: profile } = await supabaseAdmin.from('profiles').select('full_name').eq('id', user_id).single();
            if (profile?.full_name) finalUserName = profile.full_name;
            else if (!finalUserName) finalUserName = '성도';
        }

        const insertData: any = { post_id, user_id, user_name: finalUserName, content, is_private: !!is_private };
        if (parent_id) insertData.parent_id = parent_id;

        const { data: comment, error: commentError } = await supabaseAdmin
            .from('community_comments')
            .insert([insertData])
            .select()
            .single();

        if (commentError) throw commentError;

        // 2. 게시글 정보 및 작성자 찾기
        const { data: post, error: postError } = await supabaseAdmin
            .from('community_posts')
            .select('user_id, church_id')
            .eq('id', post_id)
            .single();

        // 활동 기록 남기기 (로거 추가)
        if (post?.church_id) {
            logActivity(user_id, finalUserName, 'COMMENT_CREATED', post.church_id, content.slice(0, 50));
        }

        // 3. 알림 생성 및 푸시 전송 (자신이 쓴 댓글은 알림 제외)
        if (!postError && post && post.user_id !== user_id) {
            // DB 알림 저장
            await supabaseAdmin
                .from('notifications')
                .insert([{
                    user_id: post.user_id, // 받는 사람 (원글 작성자)
                    actor_name: finalUserName, // 행위자 (댓글 작성자)
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
                            body: `${finalUserName}님이 성도님의 은혜나눔에 댓글을 남기셨습니다.`,
                            url: '/?view=community',
                            userId: post.user_id
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

export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, content, is_private } = body;

        if (!id) return NextResponse.json({ error: 'Comment ID is required' }, { status: 400 });

        const updateData: any = {};
        if (content !== undefined) updateData.content = content;
        if (is_private !== undefined) updateData.is_private = is_private;

        const { data: updatedComment, error } = await supabaseAdmin
            .from('community_comments')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(updatedComment);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

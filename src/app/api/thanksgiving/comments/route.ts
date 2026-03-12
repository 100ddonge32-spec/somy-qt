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



export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { diary_id, user_id, user_name, content, is_private } = body;

        // 1. 댓글 삽입
        const { data: comment, error: commentError } = await supabaseAdmin
            .from('thanksgiving_comments')
            .insert([{ diary_id, user_id, user_name, content, is_private: !!is_private }])
            .select()
            .single();

        if (commentError) throw commentError;

        // 2. 게시글 정보 및 작성자 찾기
        const { data: diary, error: diaryError } = await supabaseAdmin
            .from('thanksgiving_diaries')
            .select('user_id, church_id')
            .eq('id', diary_id)
            .single();

        // 활동 기록 남기기 (로거 추가)
        if (diary?.church_id) {
            logActivity(user_id, user_name, 'COMMENT_CREATED', diary.church_id, content.slice(0, 50));
        }

        // 3. 알림 생성 (본인은 본인 글에 알림 안 보냄)
        if (!diaryError && diary && diary.user_id !== user_id) {
            await supabaseAdmin
                .from('notifications')
                .insert([{
                    user_id: diary.user_id, // 원글 작성자
                    actor_name: user_name, // 댓글 쓴 사람
                    type: 'thanks_comment',
                    post_id: diary_id,
                    is_read: false
                }]);

            const { data: subsData } = await supabaseAdmin
                .from('push_subscriptions')
                .select('subscription')
                .eq('user_id', diary.user_id);

            if (subsData && subsData.length > 0) {
                for (const sub of subsData) {
                    if (!sub.subscription) continue;
                    try {
                        const pushPayload = JSON.stringify({
                            title: '🔔 감사일기에 댓글이 달렸어요!',
                            body: `${user_name}님이 성도님의 감사일기에 댓글을 남기셨습니다.`,
                            url: '/?view=thanksgiving',
                            userId: diary.user_id
                        });
                        await webpush.sendNotification(sub.subscription, pushPayload);
                    } catch (pushErr) {
                        console.error('Push Error:', pushErr);
                    }
                }
            }
        }

        return NextResponse.json(comment);
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
            .from('thanksgiving_comments')
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

export async function DELETE(req: NextRequest) {
    try {
        const body = await req.json();
        const { id } = body;

        if (!id) return NextResponse.json({ error: 'Comment ID is required' }, { status: 400 });

        const { error } = await supabaseAdmin
            .from('thanksgiving_comments')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

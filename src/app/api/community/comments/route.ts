import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
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

        // 3. 알림 생성
        if (!postError && post) {
            await supabaseAdmin
                .from('notifications')
                .insert([{
                    user_id: post.user_id, // 받는 사람 (원글 작성자)
                    actor_name: user_name, // 행위자 (댓글 작성자)
                    type: 'comment',
                    post_id: post_id,
                    is_read: false
                }]);
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

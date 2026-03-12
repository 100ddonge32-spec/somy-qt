import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logActivity } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

// 댓글 목록 조회 (GET)
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const post_id = searchParams.get('post_id');

        if (!post_id) return NextResponse.json({ error: 'Post ID required' }, { status: 400 });

        const { data, error } = await supabaseAdmin
            .from('gallery_comments')
            .select('*')
            .eq('post_id', post_id)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return NextResponse.json(data);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// 댓글 작성 (POST)
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { post_id, user_id, user_name, comment } = body;

        if (!post_id || !user_id || !comment) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('gallery_comments')
            .insert([{ post_id, user_id, user_name, comment }])
            .select()
            .single();

        if (error) throw error;

        // 게시글의 church_id 가져오기 (활동 기록용)
        const { data: post } = await supabaseAdmin
            .from('gallery_posts')
            .select('church_id')
            .eq('id', post_id)
            .single();

        if (post?.church_id) {
            logActivity(user_id, user_name, 'COMMENT_CREATED', post.church_id, comment.slice(0, 50));
        }

        return NextResponse.json(data);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// 댓글 삭제 (DELETE)
export async function DELETE(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, user_id, is_admin } = body;

        if (!id) return NextResponse.json({ error: 'Comment ID required' }, { status: 400 });

        let query = supabaseAdmin.from('gallery_comments').delete().eq('id', id);
        if (!is_admin) {
            query = query.eq('user_id', user_id);
        }

        const { error } = await query;
        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

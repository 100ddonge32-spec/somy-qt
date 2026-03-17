import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

// 좋아요 토글 (POST)
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { post_id, user_id } = body;

        if (!post_id || !user_id) return NextResponse.json({ error: 'Post ID and User ID required' }, { status: 400 });

        // 이미 좋아요를 눌렀는지 확인
        const { data: existingLike } = await supabaseAdmin
            .from('gallery_likes')
            .select('*')
            .eq('post_id', post_id)
            .eq('user_id', user_id)
            .maybeSingle();

        if (existingLike) {
            // 좋아요 취소 (삭제)
            const { error } = await supabaseAdmin
                .from('gallery_likes')
                .delete()
                .eq('id', existingLike.id);
            if (error) throw error;
            return NextResponse.json({ action: 'unliked' });
        } else {
            // 좋아요 등록
            const { error } = await supabaseAdmin
                .from('gallery_likes')
                .insert([{ post_id, user_id }]);
            if (error) throw error;
            return NextResponse.json({ action: 'liked' });
        }
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// 특정 게시물의 좋아요 수 및 내 좋아요 여부 확인 (GET)
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const post_id = searchParams.get('post_id');
        const user_id = searchParams.get('user_id');

        if (!post_id) return NextResponse.json({ error: 'Post ID required' }, { status: 400 });

        const { data: likes, error, count } = await supabaseAdmin
            .from('gallery_likes')
            .select('*', { count: 'exact' })
            .eq('post_id', post_id);

        if (error) throw error;

        const isLiked = user_id ? likes.some(l => l.user_id === user_id) : false;

        return NextResponse.json({
            count: count || 0,
            isLiked,
            liker_ids: likes.map(l => l.user_id)
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

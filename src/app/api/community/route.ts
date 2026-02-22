import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

// 게시글 목록 및 댓글 불러오기 (교회별 격리)
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const churchId = searchParams.get('church_id') || 'jesus-in';

        const { data: posts, error: postsError } = await supabaseAdmin
            .from('community_posts')
            .select(`
                *,
                comments:community_comments(*)
            `)
            .eq('church_id', churchId)
            .order('created_at', { ascending: false });

        if (postsError) throw postsError;
        return NextResponse.json(posts);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// 새 게시글 작성
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { user_id, user_name, avatar_url, content, church_id } = body;

        const { data, error } = await supabaseAdmin
            .from('community_posts')
            .insert([{
                user_id,
                user_name,
                avatar_url,
                content,
                church_id: church_id || 'jesus-in'
            }])
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// 게시글 삭제
export async function DELETE(req: NextRequest) {
    try {
        // URL 파라미터 인코딩 문제 회피: body의 JSON에서 id를 읽음
        const body = await req.json();
        const { id } = body;

        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

        console.log(`[DELETE] 게시글 삭제 시작. id=${id}`);

        // 1단계: 연결된 댓글 먼저 삭제
        const { error: commentDeleteError } = await supabaseAdmin
            .from('community_comments')
            .delete()
            .eq('post_id', id);

        if (commentDeleteError) {
            console.error('[DELETE] 댓글 삭제 중 오류 (무시하고 계속):', commentDeleteError.message);
        }

        // 2단계: 게시글 삭제
        const { error: postDeleteError } = await supabaseAdmin
            .from('community_posts')
            .delete()
            .eq('id', id);

        if (postDeleteError) {
            console.error('[DELETE] 게시글 삭제 실패:', postDeleteError);
            throw postDeleteError;
        }

        console.log(`[DELETE] 게시글 삭제 완료.`);
        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[DELETE] 최종 에러:', err);
        return NextResponse.json({ error: err.message, code: err.code }, { status: 500 });
    }
}

// 게시글 수정
export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, content } = body;

        if (!id || !content) return NextResponse.json({ error: 'ID and content are required' }, { status: 400 });

        const { data, error } = await supabaseAdmin
            .from('community_posts')
            .update({ content })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

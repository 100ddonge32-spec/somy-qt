import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
    try {
        const { post_id, user_id, type = 'community' } = await req.json();
        const tableName = type === 'community' ? 'community_posts' : 'thanksgiving_diaries';

        // 1. 현재 게시글의 liker_ids 가져오기
        const { data: post, error: fetchError } = await supabaseAdmin
            .from(tableName)
            .select('liker_ids')
            .eq('id', post_id)
            .single();

        if (fetchError) {
            // 컬럼이 없을 가능성 체크 (개발 편의를 위해 만약 에러 시 안내)
            console.error('[Reaction] Fetch Error:', fetchError);
            return NextResponse.json({ error: 'DB 설정이 필요합니다. (liker_ids 컬럼 누락 가능성)', details: fetchError.message }, { status: 500 });
        }

        let likerIds = post.liker_ids || [];
        const isLiked = likerIds.includes(user_id);

        if (isLiked) {
            // 좋아요 취소
            likerIds = likerIds.filter((id: string) => id !== user_id);
        } else {
            // 좋아요 추가
            likerIds.push(user_id);
        }

        const { data: updated, error: updateError } = await supabaseAdmin
            .from(tableName)
            .update({ liker_ids: likerIds })
            .eq('id', post_id)
            .select()
            .single();

        if (updateError) throw updateError;

        return NextResponse.json({ success: true, isLiked: !isLiked, count: likerIds.length, liker_ids: likerIds });
    } catch (err: any) {
        console.error('[Reaction Error]', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

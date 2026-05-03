import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logActivity } from '@/lib/logger';
import webpush from '@/lib/webpush';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);



const normalizeId = (id: string | null) => {
    if (!id) return 'jesus-in';
    const s = id.toLowerCase().trim();
    if (s === '예수인교회' || s === 'jesus-in' || s === '예수인' || s === 'jesus' || s === 'default' || s === 'somy-main' || s === '') {
        return 'jesus-in';
    }
    return s;
};

// 게시글 목록 및 댓글 불러오기 (교회별 격리 + 페이지네이션)
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const churchId = normalizeId(searchParams.get('church_id'));
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '5');
        const offset = (page - 1) * limit;

        // profiles 테이블과 조인하여 최신 프로필 정보를 가져옴
        const { data: posts, error: postsError } = await supabaseAdmin
            .from('thanksgiving_diaries')
            .select(`
                *,
                profiles(full_name, avatar_url),
                comments:thanksgiving_comments(*)
            `)
            .eq('church_id', churchId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (postsError) throw postsError;

        // 프론트엔드 호환성을 위해 profiles 정보를 최상위 객체로 병합 (백필 효과)
        const mergedPosts = (posts || []).map(post => {
            const profile = (post as any).profiles;
            return {
                ...post,
                user_name: profile?.full_name || post.user_name,
                avatar_url: profile?.avatar_url || post.avatar_url
            };
        });

        return NextResponse.json(mergedPosts);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// 새 게시글 작성
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { user_id, user_name, avatar_url, content, church_id, is_private } = body;
        const cid = normalizeId(church_id);

        const { data, error } = await supabaseAdmin
            .from('thanksgiving_diaries')
            .insert([{
                user_id,
                user_name,
                avatar_url,
                content,
                church_id: cid,
                is_private: is_private ?? false
            }])
            .select()
            .single();

        if (error) throw error;

        // 활동 기록 남기기
        logActivity(user_id, user_name, 'THANKS_DIARY', cid, content.slice(0, 50));

        // 새 글이 등록되면 모든 성도에게 알림 발송 (단, 본인 제외, 비밀글 아닐 때)
        if (!is_private) {
            const { data: usersToNotify } = await supabaseAdmin.from('profiles').select('id').eq('church_id', cid).neq('id', user_id);
            if (usersToNotify && usersToNotify.length > 0) {
                const userIds = usersToNotify.map(u => u.id);
                const { data: subs } = await supabaseAdmin.from('push_subscriptions').select('subscription').in('user_id', userIds);
                if (subs && subs.length > 0) {
                    const payload = JSON.stringify({
                        title: `🌻 새로운 감사일기`,
                        body: `${user_name}님의 감사일기가 올라왔습니다.`,
                        url: '/'
                    });
                    const pushPromises = subs.map(sub => webpush.sendNotification(sub.subscription, payload).catch(e => { }));
                    await Promise.allSettled(pushPromises);
                }
            }
        }

        return NextResponse.json(data);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// 게시글 삭제
export async function DELETE(req: NextRequest) {
    try {
        const body = await req.json();
        const { id } = body;

        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

        console.log(`[DELETE] 감사일기 삭제 시작. id=${id}`);

        // 1단계: 연결된 댓글 먼저 삭제
        const { error: commentDeleteError } = await supabaseAdmin
            .from('thanksgiving_comments')
            .delete()
            .eq('diary_id', id);

        if (commentDeleteError) {
            console.error('[DELETE] 댓글 삭제 중 오류:', commentDeleteError.message);
        }

        // 2단계: 게시글 삭제
        const { error: postDeleteError } = await supabaseAdmin
            .from('thanksgiving_diaries')
            .delete()
            .eq('id', id);

        if (postDeleteError) {
            console.error('[DELETE] 감사일기 삭제 실패:', postDeleteError);
            throw postDeleteError;
        }

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
        const { id, content, is_private } = body;

        if (!id || !content) return NextResponse.json({ error: 'ID and content are required' }, { status: 400 });

        const updateData: any = { content };
        if (is_private !== undefined) updateData.is_private = is_private;

        const { data, error } = await supabaseAdmin
            .from('thanksgiving_diaries')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

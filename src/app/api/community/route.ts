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
        const { user_id, user_name, avatar_url, content, church_id, is_private, is_qt } = body;
        const cid = church_id || 'jesus-in';

        const { data, error } = await supabaseAdmin
            .from('community_posts')
            .insert([{
                user_id,
                user_name,
                avatar_url,
                content,
                church_id: cid,
                is_private: is_private ?? false,  // ✅ 비공개 여부 저장
                is_qt: is_qt ?? false             // ✅ 묵상나눔 여부 저장
            }])
            .select()
            .single();

        if (error) throw error;

        // 활동 기록 남기기
        logActivity(user_id, user_name, 'POST_CREATED', cid, content.slice(0, 50));

        // ✅ 만약 묵상나눔(is_qt)이라면 qt_completions에도 기록하여 캘린더에 표시되게 함
        if (is_qt) {
            const koreaDate = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
            await supabaseAdmin.from('qt_completions').upsert({
                user_id,
                user_name: user_name || '성도',
                completed_date: koreaDate,
                answers: [content] // 게시글 내용을 첫 번째 답변으로 저장하거나 별도 처리
            }, { onConflict: 'user_id,completed_date' });
            
            // 묵상 완료 로그도 추가 기록
            logActivity(user_id, user_name, 'QT_COMPLETED', cid, koreaDate);
        }

        // 새 글이 등록되면 모든 성도에게 알림 발송 (단, 본인 제외, 비밀글 아닐 때)
        if (!is_private) {
            const { data: usersToNotify } = await supabaseAdmin.from('profiles').select('id').eq('church_id', cid).neq('id', user_id);
            if (usersToNotify && usersToNotify.length > 0) {
                const userIds = usersToNotify.map(u => u.id);

                // 푸시 알람
                const { data: subs } = await supabaseAdmin.from('push_subscriptions').select('user_id, subscription').in('user_id', userIds);
                if (subs && subs.length > 0) {
                    const pushPromises = subs.map(sub => {
                        const payload = JSON.stringify({
                            title: `✨ 새로운 은혜나눔`,
                            body: `${user_name}님이 새로운 글을 올리셨습니다.`,
                            url: '/',
                            userId: sub.user_id
                        });
                        return webpush.sendNotification(sub.subscription, payload).catch(e => { });
                    });
                    await Promise.allSettled(pushPromises);
                }

                // DB 알림
                const notis = userIds.map(uid => ({
                    user_id: uid,
                    type: 'community_post',
                    actor_name: user_name,
                    post_id: data.id,
                    is_read: false
                }));
                await supabaseAdmin.from('notifications').insert(notis);
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
        const { id, content, is_private } = body;

        if (!id || !content) return NextResponse.json({ error: 'ID and content are required' }, { status: 400 });

        const updateData: any = { content };
        if (is_private !== undefined) updateData.is_private = is_private; // 비공개 변경도 허용

        const { data, error } = await supabaseAdmin
            .from('community_posts')
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

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

export const dynamic = 'force-dynamic';

webpush.setVapidDetails(
    'mailto:pastorbaek@kakao.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BCpTn0SHIYSZzjST5xxL1Cv9svmlp3f9Xmvt9FSALBvo4QwLQCBlo_mu4ThoMHgINRmAk4c9sxwVwI2QtDyHr1I',
    process.env.VAPID_PRIVATE_KEY || 'LAAS6aJenIKYBShIGZsWVKhXNOMKwkuXvpf2NLCGZAI'
);

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

        // 3. 좋아요 추가 시 작성자에게 알림 발송 (취소가 아닐 때만)
        if (!isLiked && user_id !== updated.user_id) {
            try {
                const title = type === 'community' ? '❤️ 새로운 좋아요' : '❤️ 감사일기 응원';
                const body = type === 'community'
                    ? `${user_id.slice(0, 5)}...님이 회원님의 글을 좋아합니다.`
                    : `${user_id.slice(0, 5)}...님이 회원님의 감사일기에 공감했습니다.`;

                // DB 알림 추가
                await supabaseAdmin.from('notifications').insert({
                    user_id: updated.user_id,
                    type: type === 'community' ? 'community_like' : 'thanksgiving_like',
                    actor_name: '누군가', // 실명을 가져오려면 profiles 조인이 필요하지만 여기서는 간단히
                    post_id: post_id,
                    is_read: false
                });

                // 푸시 알람 (필요 시)
                const { data: subs } = await supabaseAdmin
                    .from('push_subscriptions')
                    .select('subscription')
                    .eq('user_id', updated.user_id);

                if (subs && subs.length > 0) {
                    const payload = JSON.stringify({ title, body, url: '/' });
                    const pushPromises = subs.map(sub => webpush.sendNotification(sub.subscription, payload).catch(() => { }));
                    await Promise.allSettled(pushPromises);
                }
            } catch (notiError) {
                console.error('[Reaction Noti Error]', notiError);
            }
        }

        return NextResponse.json({ success: true, isLiked: !isLiked, count: likerIds.length, liker_ids: likerIds });
    } catch (err: any) {
        console.error('[Reaction Error]', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

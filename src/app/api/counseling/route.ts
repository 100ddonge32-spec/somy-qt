import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from '@/lib/webpush';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);



export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const churchId = searchParams.get('church_id') || 'jesus-in';
    const userId = searchParams.get('user_id');
    const isAdmin = searchParams.get('admin') === 'true';

    try {
        let query = supabaseAdmin
            .from('counseling_requests')
            .select('*')
            .eq('church_id', churchId)
            .order('created_at', { ascending: false });

        // 일반 성도인 경우: '전체공개(is_public=true)' 글과 '본인이 작성한 비공개 글'만 노출
        if (!isAdmin && userId) {
            query = query.or(`is_public.eq.true,user_id.eq.${userId}`);
        } else if (!isAdmin && !userId) {
            // 로그인하지 않은 비회원은 전체 공개된 기도글만 조회 가능
            query = query.eq('is_public', true);
        }

        const { data, error } = await query;
        if (error) throw error;
        return NextResponse.json(data);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { user_id, user_name, church_id, content, is_public } = body;

        let finalUserName = user_name;
        if (!finalUserName || /^[0-9]+$/.test(String(finalUserName)) || String(finalUserName).length > 20) {
            const { data: profile } = await supabaseAdmin.from('profiles').select('full_name').eq('id', user_id).single();
            if (profile?.full_name) finalUserName = profile.full_name;
            else if (!finalUserName) finalUserName = '성도';
        }

        const { data, error } = await supabaseAdmin
            .from('counseling_requests')
            .insert([{ 
                user_id, 
                user_name: finalUserName, 
                church_id: church_id || 'jesus-in', 
                content,
                is_public: is_public ?? false
            }])
            .select()
            .single();

        if (error) throw error;

        // 목회자에게 비공개 기도를 보냈을 때만 기존의 목사님 Push 알림 작동
        if (!(is_public ?? false)) {
            const { data: admins } = await supabaseAdmin.from('app_admins')
                .select('email, role, church_id')
                .in('role', ['church_admin', 'super_admin', 'sub_admin']);

            const targetAdminsEmails = (admins || [])
                .filter(a => a.role === 'super_admin' || a.church_id === (church_id || 'jesus-in'))
                .map(a => a.email.toLowerCase().trim());

            const orClauses = [];
            if (targetAdminsEmails.length > 0) {
                orClauses.push(`email.in.(${targetAdminsEmails.join(',')})`);
            }
            orClauses.push('full_name.ilike.%백동희%', 'full_name.ilike.%동희%');

            const { data: adminProfiles } = await supabaseAdmin.from('profiles')
                .select('id, email, full_name')
                .or(orClauses.join(','));

            if (adminProfiles && adminProfiles.length > 0) {
                const notifiedIds = new Set<string>();

                for (const p of adminProfiles) {
                    if (notifiedIds.has(p.id)) continue;
                    notifiedIds.add(p.id);

                    await supabaseAdmin.from('notifications').insert([{
                        user_id: p.id,
                        actor_name: finalUserName,
                        type: 'counseling_req',
                        post_id: data.id,
                        is_read: false
                    }]);

                    const { data: subsData } = await supabaseAdmin.from('push_subscriptions').select('subscription').eq('user_id', p.id);
                    if (subsData && subsData.length > 0) {
                        for (const sub of subsData) {
                            if (!sub.subscription) continue;
                            try {
                                const payload = JSON.stringify({
                                    title: '🔒 새 비밀 기도 요청',
                                    body: `${finalUserName} 성도님이 비밀 기도를 요청했습니다.`,
                                    url: '/?view=counseling',
                                    userId: p.id
                                });
                                await webpush.sendNotification(sub.subscription, payload);
                            } catch (e) {
                                console.error(`[Push Error] ${p.id}:`, e);
                            }
                        }
                    }
                }
            }
        } else {
            // 전체공개로 올렸을 때 알림 발송 (본인 제외)
            const { data: usersToNotify } = await supabaseAdmin
                .from('profiles')
                .select('id')
                .eq('church_id', church_id || 'jesus-in')
                .neq('id', user_id);

            if (usersToNotify && usersToNotify.length > 0) {
                const userIds = usersToNotify.map(u => u.id);

                // 푸시 알림 발송
                const { data: subs } = await supabaseAdmin
                    .from('push_subscriptions')
                    .select('user_id, subscription')
                    .in('user_id', userIds);

                if (subs && subs.length > 0) {
                    const pushPromises = subs.map(sub => {
                        const payload = JSON.stringify({
                            title: `🙏 새로운 기도제목`,
                            body: `${finalUserName}님이 새로운 기도제목을 나누셨습니다.`,
                            url: '/?view=counseling',
                            userId: sub.user_id
                        });
                        return webpush.sendNotification(sub.subscription, payload).catch(e => { });
                    });
                    Promise.allSettled(pushPromises);
                }

                // DB 알림 저장
                const notis = userIds.map(uid => ({
                    user_id: uid,
                    type: 'counseling_public_req',
                    actor_name: finalUserName,
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

export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { 
            id, 
            reply, 
            user_reply, 
            content, 
            admin_name, 
            user_name, 
            overwrite,
            action,
            comment,
            comment_id,
            liker_id
        } = body;

        const { data: existing, error: fetchError } = await supabaseAdmin
            .from('counseling_requests')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;

        let finalUserName = user_name;
        if (user_reply && (!finalUserName || /^[0-9]+$/.test(String(finalUserName)) || String(finalUserName).length > 20)) {
            const { data: profile } = await supabaseAdmin.from('profiles').select('full_name').eq('id', existing.user_id).single();
            if (profile?.full_name) finalUserName = profile.full_name;
            else if (!finalUserName) finalUserName = '성도';
        }

        // 좋아요, 댓글 등 신규 액션 처리
        if (action === 'like' && liker_id) {
            const currentLikes = existing.liker_ids || [];
            let newLikes: string[] = [];
            if (currentLikes.includes(liker_id)) {
                newLikes = currentLikes.filter((lid: string) => lid !== liker_id);
            } else {
                newLikes = [...currentLikes, liker_id];
            }

            const { data, error } = await supabaseAdmin
                .from('counseling_requests')
                .update({ liker_ids: newLikes })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return NextResponse.json(data);
        }

        if (action === 'comment' && comment) {
            // 비밀글일 때 보안 권한 체크
            if (!existing.is_public) {
                const isAdmin = comment.user_id === 'admin' || comment.is_admin === true; // 목회자 체크
                const isOwner = comment.user_id === existing.user_id;
                if (!isOwner && !isAdmin) {
                    return NextResponse.json({ error: '비공개 기도글에는 권한이 없습니다.' }, { status: 403 });
                }
            }

            const currentComments = existing.comments || [];
            const newComments = [...currentComments, comment];

            const { data, error } = await supabaseAdmin
                .from('counseling_requests')
                .update({ comments: newComments })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return NextResponse.json(data);
        }

        if (action === 'delete_comment' && comment_id) {
            const currentComments = existing.comments || [];
            const newComments = currentComments.filter((c: any) => c.id !== comment_id);

            const { data, error } = await supabaseAdmin
                .from('counseling_requests')
                .update({ comments: newComments })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return NextResponse.json(data);
        }

        // 기존 1:1 답글 및 수정 필드 처리
        const updateData: any = {};
        if (content !== undefined) updateData.content = content;

        if (reply !== undefined) {
            if (overwrite) {
                updateData.reply = reply;
            } else {
                const prevReply = (existing.reply || "").toString().trim();
                updateData.reply = prevReply ? `${prevReply}\n\n[추가 답변]\n${reply}` : reply;
            }
        }
        if (user_reply !== undefined) {
            if (overwrite) {
                updateData.user_reply = user_reply;
            } else {
                updateData.user_reply = existing.user_reply ? `${existing.user_reply}\n\n[추가 답글]\n${user_reply}` : user_reply;
            }
        }

        const { data, error } = await supabaseAdmin
            .from('counseling_requests')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // 목사님이 1:1 답변을 단 경우
        if (reply) {
            await supabaseAdmin.from('notifications').insert([{
                user_id: data.user_id,
                actor_name: admin_name || '담임목사',
                type: 'counseling_reply',
                post_id: data.id,
                is_read: false
            }]);
            const { data: subsData } = await supabaseAdmin.from('push_subscriptions').select('subscription').eq('user_id', data.user_id);
            if (subsData && subsData.length > 0) {
                for (const sub of subsData) {
                    if (!sub.subscription) continue;
                    try {
                        const payload = JSON.stringify({
                            title: '🙏 1:1 비밀기도 답변 도착',
                            body: `담임목사님이 기도 답변을 작성하셨습니다.`,
                            url: '/?view=counseling',
                            userId: data.user_id
                        });
                        await webpush.sendNotification(sub.subscription, payload);
                    } catch (e) { }
                }
            }
        }

        return NextResponse.json(data);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const body = await req.json();
        const { id } = body;

        if (!id) return NextResponse.json({ error: 'Prayer request ID is required' }, { status: 400 });

        const { error } = await supabaseAdmin
            .from('counseling_requests')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

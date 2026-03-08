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

        if (!isAdmin && userId) {
            query = query.eq('user_id', userId);
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
        const { user_id, user_name, church_id, content } = body;

        const { data, error } = await supabaseAdmin
            .from('counseling_requests')
            .insert([{ user_id, user_name, church_id: church_id || 'jesus-in', content }])
            .select()
            .single();

        if (error) throw error;

        // ✅ 알림 전송 로직 개선 (김부장의 스마트 알림 - OR 쿼리 수정)
        // 1. 관리자 정보 조회 (해당 교회의 관리자 + 모든 슈퍼관리자)
        const { data: admins } = await supabaseAdmin.from('app_admins')
            .select('email, role, church_id')
            .in('role', ['church_admin', 'super_admin']);

        const targetAdminsEmails = (admins || [])
            .filter(a => a.role === 'super_admin' || a.church_id === (church_id || 'jesus-in'))
            .map(a => a.email.toLowerCase().trim());

        // 2. 관리자 프로필 및 '보스' 계정(백동희/동희) 추가 조회
        // [수정] targetAdminsEmails가 비어있을 때 PostgREST 에러 방지
        const orClauses = [];
        if (targetAdminsEmails.length > 0) {
            orClauses.push(`email.in.(${targetAdminsEmails.join(',')})`);
        }
        orClauses.push('full_name.ilike.%백동희%', 'full_name.ilike.%동희%'); // 이름 매칭을 좀 더 유연하게 (ilike)

        const { data: adminProfiles } = await supabaseAdmin.from('profiles')
            .select('id, email, full_name')
            .or(orClauses.join(','));

        if (adminProfiles && adminProfiles.length > 0) {
            // 중복 알림 방지를 위한 id Set
            const notifiedIds = new Set<string>();

            for (const p of adminProfiles) {
                if (notifiedIds.has(p.id)) continue;
                notifiedIds.add(p.id);

                // 내부 알림함 저장 (여기가 채워져야 'N' 표기가 나타남)
                await supabaseAdmin.from('notifications').insert([{
                    user_id: p.id,
                    actor_name: user_name,
                    type: 'counseling_req',
                    post_id: data.id,
                    is_read: false
                }]);

                // 실시간 푸쉬 발송
                const { data: subsData } = await supabaseAdmin.from('push_subscriptions').select('subscription').eq('user_id', p.id);
                if (subsData && subsData.length > 0) {
                    for (const sub of subsData) {
                        if (!sub.subscription) continue;
                        try {
                            const payload = JSON.stringify({
                                title: '🙏 새 상담/기도 요청',
                                body: `${user_name} 성도님의 요청이 도착했습니다.`,
                                url: '/?view=counseling',
                                userId: p.id
                            });
                            await webpush.sendNotification(sub.subscription, payload);
                        } catch (e) {
                            console.error(`[Push Error] for ${p.id}:`, e);
                        }
                    }
                }
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
        const { id, reply, user_reply, content, admin_name, user_name, overwrite } = body;

        // 기존 데이터 가져오기 (추가 답글인 경우를 위해)
        const { data: existing, error: fetchError } = await supabaseAdmin
            .from('counseling_requests')
            .select('content, reply, user_reply')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;

        const updateData: any = {};
        if (content !== undefined) {
            updateData.content = content;
        }

        if (reply !== undefined) {
            if (overwrite) {
                updateData.reply = reply;
            } else {
                // 목사님 답변이 이미 있으면 개행 후 추가
                updateData.reply = existing.reply ? `${existing.reply}\n\n[추가 답변]\n${reply}` : reply;
            }
        }
        if (user_reply !== undefined) {
            if (overwrite) {
                updateData.user_reply = user_reply;
            } else {
                // 성도 답글이 이미 있으면 개행 후 추가
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

        // 목사님이 답변을 단 경우 -> 성도에게 알림
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
                            title: '🙏 상담/기도 답변 도착',
                            body: `담임목사님의 답변이 작성되었습니다.`,
                            url: '/?view=counseling',
                            userId: data.user_id
                        });
                        await webpush.sendNotification(sub.subscription, payload);
                    } catch (e) { }
                }
            }
        }

        // ✅ 성도가 추가 답글을 단 경우 -> 관리자에게 알림 (스마트 타겟팅)
        if (user_reply) {
            const { data: admins } = await supabaseAdmin.from('app_admins')
                .select('email, role, church_id')
                .in('role', ['church_admin', 'super_admin']);

            const targetAdminsEmails = (admins || [])
                .filter(a => a.role === 'super_admin' || a.church_id === (data.church_id))
                .map(a => a.email.toLowerCase().trim());

            // [수정] targetAdminsEmails가 비어있을 때 PostgREST 에러 방지
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

                    // 내부 알림함 저장 (N 표기 발생 지점)
                    await supabaseAdmin.from('notifications').insert([{
                        user_id: p.id,
                        actor_name: user_name || '성도',
                        type: 'counseling_user_reply',
                        post_id: data.id,
                        is_read: false
                    }]);

                    const { data: subsData } = await supabaseAdmin.from('push_subscriptions').select('subscription').eq('user_id', p.id);
                    if (subsData && subsData.length > 0) {
                        for (const sub of subsData) {
                            if (!sub.subscription) continue;
                            try {
                                const payload = JSON.stringify({
                                    title: '🙏 상담/기도 추가 답글',
                                    body: `${user_name || '성도'}님의 추가 답글이 도착했습니다.`,
                                    url: '/?view=counseling',
                                    userId: p.id
                                });
                                await webpush.sendNotification(sub.subscription, payload);
                            } catch (e) { }
                        }
                    }
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

        if (!id) return NextResponse.json({ error: 'Counseling request ID is required' }, { status: 400 });

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

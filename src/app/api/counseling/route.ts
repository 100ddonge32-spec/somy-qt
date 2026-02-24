import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

webpush.setVapidDetails(
    'mailto:pastorbaek@kakao.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BCpTn0SHIYSZzjST5xxL1Cv9svmlp3f9Xmvt9FSALBvo4QwLQCBlo_mu4ThoMHgINRmAk4c9sxwVwI2QtDyHr1I',
    process.env.VAPID_PRIVATE_KEY || 'LAAS6aJenIKYBShIGZsWVKhXNOMKwkuXvpf2NLCGZAI'
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

        // 알림 전송 (관리자에게)
        const { data: admins } = await supabaseAdmin.from('app_admins').select('email').in('role', ['church_admin', 'super_admin']).eq('church_id', church_id || 'jesus-in');
        if (admins && admins.length > 0) {
            const adminEmails = admins.map(a => a.email);
            const { data: adminProfiles } = await supabaseAdmin.from('profiles').select('id').in('email', adminEmails);
            if (adminProfiles) {
                for (const p of adminProfiles) {
                    await supabaseAdmin.from('notifications').insert([{
                        user_id: p.id,
                        actor_name: user_name,
                        type: 'counseling_req',
                        post_id: data.id,
                        is_read: false
                    }]);
                    const { data: subData } = await supabaseAdmin.from('push_subscriptions').select('subscription').eq('user_id', p.id).single();
                    if (subData && subData.subscription) {
                        try {
                            const payload = JSON.stringify({ title: '🙏 새 상담/기도 요청', body: `${user_name} 성도님의 요청이 도착했습니다.`, url: '/?view=counseling' });
                            await webpush.sendNotification(subData.subscription, payload);
                        } catch (e) { }
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
        const { id, reply, admin_name } = body;

        const { data, error } = await supabaseAdmin
            .from('counseling_requests')
            .update({ reply })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        if (reply) {
            await supabaseAdmin.from('notifications').insert([{
                user_id: data.user_id,
                actor_name: admin_name || '담임목사',
                type: 'counseling_reply',
                post_id: data.id,
                is_read: false
            }]);
            const { data: subData } = await supabaseAdmin.from('push_subscriptions').select('subscription').eq('user_id', data.user_id).single();
            if (subData && subData.subscription) {
                try {
                    const payload = JSON.stringify({ title: '🙏 상담/기도 답변 도착', body: `담임목사님의 답변이 작성되었습니다.`, url: '/?view=counseling' });
                    await webpush.sendNotification(subData.subscription, payload);
                } catch (e) { }
            }
        }

        return NextResponse.json(data);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

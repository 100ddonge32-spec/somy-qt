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
    const churchId = searchParams.get('church_id') || '';

    try {
        const { data, error } = await supabaseAdmin
            .from('announcements')
            .select('*')
            .eq('church_id', churchId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return NextResponse.json(data);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { church_id, title, content, author_name } = body;

        const { data: announcement, error: insertError } = await supabaseAdmin
            .from('announcements')
            .insert([{ church_id: church_id || 'jesus-in', title, content, author_name }])
            .select()
            .single();

        if (insertError) throw insertError;

        // 해당 교회의 모든 사용자에게 푸시 알림 전송 로직
        const targetChurchId = church_id || 'jesus-in';
        const { data: subscriptions } = await supabaseAdmin
            .from('push_subscriptions')
            .select('user_id, subscription, profiles!inner(church_id)')
            .eq('profiles.church_id', targetChurchId);

        if (subscriptions && subscriptions.length > 0) {
            const pushPromises = subscriptions.map(sub => {
                if (sub.subscription) {
                    const payload = JSON.stringify({
                        title: `📢 [공지] ${title}`,
                        body: content.length > 30 ? content.substring(0, 30) + '...' : content,
                        url: '/',
                        userId: sub.user_id
                    });
                    return webpush.sendNotification(sub.subscription, payload).catch(e => console.error('Push fail', e));
                }
                return Promise.resolve();
            });
            await Promise.all(pushPromises);
        }

        // [DB 알림] 해당 교원의 모든 사용자에게 알림 저장
        const { data: profiles } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('church_id', targetChurchId);

        if (profiles && profiles.length > 0) {
            const notis = profiles.map(p => ({
                user_id: p.id,
                type: 'announcement',
                actor_name: title, // 공지 제목을 행위자 명으로 활용
                post_id: announcement.id,
                is_read: false
            }));
            await supabaseAdmin.from('notifications').insert(notis);
        }

        return NextResponse.json(announcement);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const body = await req.json();
        const { id } = body;

        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

        const { error } = await supabaseAdmin
            .from('announcements')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

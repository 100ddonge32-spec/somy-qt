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
        const body = await req.json();
        const { user_id, subscription } = body;

        if (!user_id || !subscription) {
            return NextResponse.json({ error: 'User ID and subscription are required' }, { status: 400 });
        }

        // 같은 유저가 여러 브라우저에서 구독할 수 있으므로 upsert (또는 덮어쓰기)
        // 여기서는 구독 정보 자체를 고유 키로 사용하여 중복 저장 방지
        const { error } = await supabaseAdmin
            .from('push_subscriptions')
            .upsert({
                user_id,
                subscription,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id' // 한 유저당 하나의 최신 구독 정보 유지 (심플하게)
            });

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('Push Subscribe Error:', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

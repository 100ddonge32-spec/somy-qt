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
        const { user_id, subscription } = await req.json();

        if (!user_id || !subscription) {
            return NextResponse.json({ error: 'User ID and subscription are required' }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('push_subscriptions')
            .upsert({ user_id, subscription }, { onConflict: 'user_id' });

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

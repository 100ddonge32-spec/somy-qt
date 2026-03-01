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

        // [김부장의 통합 구독 시스템]
        // 같은 유저가 여러 기기(폰, 컴)에서 접속해도 하나의 최신 정보로 관리하거나
        // 나중에는 여러 기기 발송을 위해 테이블 설계를 조정할 수 있습니다.
        // 현재는 한 유저당 하나의 최신 구독 정보만 유지합니다.
        const { error } = await supabaseAdmin
            .from('push_subscriptions')
            .upsert({
                user_id,
                subscription,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id'
            });

        if (error) throw error;

        console.log(`[Push] Subscribed user: ${user_id}`);
        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('Push Subscribe Error:', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET() {
    const { data, error } = await supabaseAdmin
        .from('church_settings')
        .select('*')
        .eq('id', 1)
        .single();

    if (error) {
        return NextResponse.json({ settings: null, error: error.message });
    }
    return NextResponse.json({ settings: data });
}

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { church_name, church_logo_url, church_url, app_subtitle, plan } = body;

    const { error } = await supabaseAdmin
        .from('church_settings')
        .upsert({
            id: 1,
            church_name,
            church_logo_url,
            church_url,
            app_subtitle,
            plan: plan || 'free', // 'free' 또는 'premium'
        });

    if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
}

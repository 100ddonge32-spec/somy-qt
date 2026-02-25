import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const churchId = searchParams.get('church_id');

    console.log(`[API Settings] Requesting for church_id: ${churchId}`);

    let { data, error } = await supabaseAdmin
        .from('church_settings')
        .select('*')
        .eq('church_id', churchId || 'jesus-in')
        .maybeSingle();

    if (!data) {
        // 기본값(ID 1) 조회
        const { data: defaultData } = await supabaseAdmin
            .from('church_settings')
            .select('*')
            .eq('id', 1)
            .single();
        data = defaultData;
    }

    return NextResponse.json({ settings: data });
}

export async function POST(req: NextRequest) {
    const body = await req.json();
    const {
        church_name,
        church_logo_url,
        church_url,
        app_subtitle,
        plan,
        sermon_url,
        sermon_summary,
        sermon_q1,
        sermon_q2,
        sermon_q3,
        custom_ccm_list,
        community_visible
    } = body;

    const { error } = await supabaseAdmin
        .from('church_settings')
        .upsert({
            id: 1, // 현재는 단일 교회이므로 고정 ID 1 사용
            church_name,
            church_logo_url,
            church_url,
            app_subtitle,
            plan: plan || 'free',
            community_visible: community_visible ?? true,
            allow_member_edit: body.allow_member_edit ?? false, // ✅ 누락된 필드 추가
            sermon_url,
            sermon_summary,
            sermon_q1,
            sermon_q2,
            sermon_q3,
            custom_ccm_list
        });

    if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
}

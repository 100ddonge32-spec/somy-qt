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
        const { data: defaultData } = await supabaseAdmin
            .from('church_settings')
            .select('*')
            .eq('id', 1)
            .single();
        data = defaultData;
    }

    if (data) {
        // ✅ DB 컬럼이 없을 경우를 대비해 plan 필드에 저장된 정보를 읽어와 매핑합니다.
        data.allow_member_edit = data.allow_member_edit || (data.plan && data.plan.includes('member_edit_on')) || false;
        if (data.plan) data.plan = data.plan.split('|')[0]; // 원래 plan 값만 추출
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
        manual_sermon_url,
        sermon_summary,
        sermon_q1,
        sermon_q2,
        sermon_q3,
        custom_ccm_list,
        community_visible,
        allow_member_edit,
        today_book_title,
        today_book_description,
        today_book_image_url
    } = body;

    // ✅ DB 컬럼이 없을 가능성이 크므로 plan 필드에 플래그를 심어서 저장하는 '김부장의 신의 한 수' 적용
    const encodedPlan = (plan || 'free').split('|')[0] + (allow_member_edit ? '|member_edit_on' : '');

    const { error } = await supabaseAdmin
        .from('church_settings')
        .upsert({
            id: 1,
            church_name,
            church_logo_url,
            church_url,
            app_subtitle,
            plan: encodedPlan,
            community_visible: community_visible ?? true,
            sermon_url,
            manual_sermon_url,
            sermon_summary,
            sermon_q1,
            sermon_q2,
            sermon_q3,
            custom_ccm_list,
            today_book_title,
            today_book_description,
            today_book_image_url
        });

    if (error) {
        console.error("[Settings POST Error]", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
}

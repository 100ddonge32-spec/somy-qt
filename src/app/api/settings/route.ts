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
        // ✅ DB 컬럼이 없을 경우를 대비해 plan 필드에 저장된 정보를 읽어와 매핑하는 '김부장의 신의 한 수'
        const planStr = data.plan || '';

        // 1. 멤버 수정 허용
        data.allow_member_edit = data.allow_member_edit || planStr.includes('member_edit_on');

        // 2. 행사 포스터 노출 여부
        data.event_poster_visible = data.event_poster_visible || planStr.includes('poster_on');

        // 3. 행사 포스터 URL
        if (!data.event_poster_url && planStr.includes('poster_url:')) {
            const match = planStr.match(/poster_url:([^|]+)/);
            if (match) data.event_poster_url = match[1];
        }

        // 4. 담임목사 칼럼 제목
        if (!data.pastor_column_title && planStr.includes('column_title:')) {
            const match = planStr.match(/column_title:([^|]+)/);
            if (match) data.pastor_column_title = decodeURIComponent(match[1]);
        }

        // 5. 담임목사 칼럼 내용
        if (!data.pastor_column_content && planStr.includes('column_content:')) {
            const match = planStr.match(/column_content:([^|]+)/);
            if (match) data.pastor_column_content = decodeURIComponent(match[1]);
        }

        // 6. 설교 관련 필드 (추가 컬럼 부재 시 대비)
        if (!data.manual_sermon_url && planStr.includes('m_sermon_url:')) {
            const match = planStr.match(/m_sermon_url:([^|]+)/);
            if (match) data.manual_sermon_url = decodeURIComponent(match[1]);
        }
        if (!data.sermon_summary && planStr.includes('s_summary:')) {
            const match = planStr.match(/s_summary:([^|]+)/);
            if (match) data.sermon_summary = decodeURIComponent(match[1]);
        }
        if (!data.sermon_q1 && planStr.includes('s_q1:')) {
            const match = planStr.match(/s_q1:([^|]+)/);
            if (match) data.sermon_q1 = decodeURIComponent(match[1]);
        }
        if (!data.sermon_q2 && planStr.includes('s_q2:')) {
            const match = planStr.match(/s_q2:([^|]+)/);
            if (match) data.sermon_q2 = decodeURIComponent(match[1]);
        }
        if (!data.sermon_q3 && planStr.includes('s_q3:')) {
            const match = planStr.match(/s_q3:([^|]+)/);
            if (match) data.sermon_q3 = decodeURIComponent(match[1]);
        }

        if (data.plan) data.plan = data.plan.split('|')[0]; // 원래 plan 값만 추출
    }

    return NextResponse.json({ settings: data });
}

export async function POST(req: NextRequest) {
    const body = await req.json();
    const {
        id,
        church_id,
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
        today_book_image_url,
        event_poster_url,
        event_poster_visible,
        pastor_column_title,
        pastor_column_content
    } = body;

    // ✅ DB 컬럼이 없을 가능성을 대비해 plan 필드에 플래그를 심어 저장 (김부장 방식 확장)
    let encodedPlan = (plan || 'free').split('|')[0];
    if (allow_member_edit) encodedPlan += '|member_edit_on';
    if (event_poster_visible) encodedPlan += '|poster_on';
    if (event_poster_url) encodedPlan += `|poster_url:${event_poster_url}`;
    if (pastor_column_title) encodedPlan += `|column_title:${encodeURIComponent(pastor_column_title)}`;
    if (pastor_column_content) encodedPlan += `|column_content:${encodeURIComponent(pastor_column_content)}`;

    // 설교 요약 필드도 인코딩하여 저장 (컬럼 누락 시 백업용)
    if (manual_sermon_url) encodedPlan += `|m_sermon_url:${encodeURIComponent(manual_sermon_url)}`;
    if (sermon_summary) encodedPlan += `|s_summary:${encodeURIComponent(sermon_summary)}`;
    if (sermon_q1) encodedPlan += `|s_q1:${encodeURIComponent(sermon_q1)}`;
    if (sermon_q2) encodedPlan += `|s_q2:${encodeURIComponent(sermon_q2)}`;
    if (sermon_q3) encodedPlan += `|s_q3:${encodeURIComponent(sermon_q3)}`;

    const baseData = {
        church_id: church_id || 'jesus-in',
        church_name,
        church_logo_url,
        church_url,
        app_subtitle,
        plan: encodedPlan,
        community_visible: community_visible ?? true,
        sermon_url,
        custom_ccm_list,
        today_book_title,
        today_book_description,
        today_book_image_url
    };

    // 1차 시도: 모든 컬럼 포함하여 저장
    const { error: firstError } = await supabaseAdmin
        .from('church_settings')
        .upsert({
            ...baseData,
            manual_sermon_url,
            sermon_summary,
            sermon_q1,
            sermon_q2,
            sermon_q3,
            event_poster_url,
            event_poster_visible: event_poster_visible ?? false,
            pastor_column_title,
            pastor_column_content
        }, { onConflict: 'church_id' }); // ✅ ID가 아닌 church_id를 기준으로 업데이트!

    if (firstError) {
        console.warn("[Settings POST] First attempt failed, retrying without new columns...", firstError.message);

        // 2차 시도: 새 컬럼을 제외하고 plan 필드의 인코딩에 의존하여 저장 (이것이 진정한 신의 한 수)
        const { error: secondError } = await supabaseAdmin
            .from('church_settings')
            .upsert(baseData, { onConflict: 'church_id' });

        if (secondError) {
            console.error("[Settings POST Error]", secondError);
            return NextResponse.json({ success: false, error: secondError.message }, { status: 500 });
        }
    }

    return NextResponse.json({ success: true });
}

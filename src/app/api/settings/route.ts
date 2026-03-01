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

    console.log(`[API Settings] Requesting settings. Fallback strategy active.`);

    const targetChurchId = churchId;

    if (!targetChurchId) {
        return NextResponse.json({ settings: null });
    }

    // 1순위: church_id로 검색
    let { data, error } = await supabaseAdmin
        .from('church_settings')
        .select('*')
        .eq('church_id', targetChurchId)
        .maybeSingle();

    // 2순위: jesus-in에 한해서는 id=1 레코드를 마지막 보루로 시도 (호환성)
    if (!data && targetChurchId === 'jesus-in') {
        const { data: fallback } = await supabaseAdmin
            .from('church_settings')
            .select('*')
            .eq('id', 1)
            .maybeSingle();
        if (fallback) {
            data = fallback;
            console.log(`[API Settings] Fallback to ID 1 successful for jesus-in`);
        }
    }

    if (data) {
        // [보정] 주요 필드가 비어있을 경우 기본값 주입 (데이터 증발 방지용 안전장치)
        if (!data.church_name) data.church_name = "예수인교회";
        if (!data.church_logo_url) data.church_logo_url = "https://lfjrfyylsxhvwosdpujv.supabase.co/storage/v1/object/public/church-assets/jesus-in-logo.png";
        if (!data.app_subtitle) data.app_subtitle = "말씀과 기도로 거룩해지는 공동체";

        // ✅ DB 컬럼이 없을 경우를 대비해 plan 필드에 저장된 정보를 읽어와 매핑하는 '김부장의 신의 한 수'
        const planStr = data.plan || '';

        // 1. 멤버 수정 허용
        data.allow_member_edit = data.allow_member_edit || planStr.includes('member_edit_on');

        // 2. 행사 포스터 노출 여부
        data.event_poster_visible = data.event_poster_visible || planStr.includes('poster_on');

        // 3. 행사 포스터 URL (plan 필드 인코딩 데이터가 컬럼 데이터보다 최신일 수 있으므로 우선순위 부여)
        if (planStr.includes('poster_url:')) {
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
        pastor_column_content,
        church_id: body_church_id
    } = body;

    const targetChurchId = body_church_id || 'jesus-in';

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

    const baseData: any = {
        church_id: targetChurchId,
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

    // ✅ DB 제약 조건 문제를 피하기 위해 먼저 기존 레코드를 조회하여 ID를 확보
    const { data: existingRecord } = await supabaseAdmin
        .from('church_settings')
        .select('id')
        .eq('church_id', targetChurchId)
        .maybeSingle();

    if (existingRecord) {
        baseData.id = existingRecord.id;
    } else if (targetChurchId === 'jesus-in') {
        // jesus-in(id:1)인 경우 기존 호환성을 위해 id:1 강제 지정
        baseData.id = 1;
    }

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
        }); // onConflict를 명시하지 않으면 Primary Key(id)를 기준으로 처리함

    if (firstError) {
        console.warn("[Settings POST] First attempt failed, retrying without new columns...", firstError.message);

        // 2차 시도: 새 컬럼을 제외하고 plan 필드의 인코딩에 의존하여 저장
        const { error: secondError } = await supabaseAdmin
            .from('church_settings')
            .upsert(baseData);

        if (secondError) {
            console.error("[Settings POST Error]", secondError);
            return NextResponse.json({ success: false, error: secondError.message }, { status: 500 });
        }
    }

    return NextResponse.json({ success: true });
}

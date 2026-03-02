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
        if (data.plan) {
            // [트라이얼 체크] 만료일 및 사용량 파싱 (이름이 'trial'로 시작하는 경우에만)
            if (planStr.startsWith('trial')) {
                const expireMatch = planStr.match(/expires:([^|]+)/);
                const usageMatch = planStr.match(/usage:([^|]+)/);
                const limitMatch = planStr.match(/limit:([^|]+)/);

                data.trial_expires_at = expireMatch ? expireMatch[1] : null;
                data.trial_usage_count = usageMatch ? parseInt(usageMatch[1]) : 0;
                data.trial_usage_limit = limitMatch ? parseInt(limitMatch[1]) : 0;
            }
            data.plan = data.plan.split('|')[0]; // 원래 plan 값만 추출 (ui용)
        }
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

    const targetChurchId = body_church_id;

    if (!targetChurchId) {
        return NextResponse.json({ success: false, error: "church_id가 유효하지 않습니다." }, { status: 400 });
    }

    // [보안] jesus-in(본교회) 보호 및 트라이얼 정보 유입 원천 차단
    let cleanPlan = plan;
    let cleanName = church_name;
    let cleanSubtitle = app_subtitle;
    let cleanColumnTitle = pastor_column_title;
    let cleanColumnContent = pastor_column_content;
    let cleanLogoUrl = church_logo_url;
    let cleanSermonUrl = sermon_url;
    let cleanSermonSummary = sermon_summary;
    let cleanSermonQ1 = sermon_q1;
    let cleanSermonQ2 = sermon_q2;
    let cleanSermonQ3 = sermon_q3;

    const trialKeywords = ['(체험판)', '체험용', '트라이얼', 'demo', '샘플', '가상 성도', '가상성도', '오늘의 묵상 칼럼', '소미와 함께'];

    if (targetChurchId === 'jesus-in') {
        // 1. 이름 및 부제목 보호 (필수)
        if (!cleanName || trialKeywords.some(k => cleanName.includes(k))) cleanName = '예수인교회';
        if (!cleanSubtitle || trialKeywords.some(k => cleanSubtitle.includes(k))) cleanSubtitle = '함께 성장하는 영적 공동체';

        // 2. 로고 보호 (체험판 전용 로고나 빈 로고 방지)
        if (!cleanLogoUrl || cleanLogoUrl.includes('trial-') || cleanLogoUrl.includes('placeholder')) {
            cleanLogoUrl = 'https://ai-qt.vercel.app/jesus-in-logo.png'; // 본교회 기본 로고 강제 지정
        }

        // 3. 설교 유튜브 채널 보호 (엉뚱한 실습용 채널 방지)
        if (!cleanSermonUrl || cleanSermonUrl.length < 5) {
            cleanSermonUrl = 'UC7-G1K-vN4G6vF_x5Wl9_8A'; // 본교회 기본 채널 ID (예시)
        }

        // 4. 칼럼 제목 및 내용 보호 (더미 데이터 유입 차단)
        if (!cleanColumnTitle || trialKeywords.some(k => cleanColumnTitle.includes(k))) {
            cleanColumnTitle = '🙏 오늘의 목양 메시지';
        }
        if (!cleanColumnContent || trialKeywords.some(k => cleanColumnContent.includes(k))) {
            cleanColumnContent = '반갑습니다. 예수인교회 성도님들을 주님의 이름으로 축복합니다. 소미와 함께 말씀 묵상의 즐거움을 누리시길 기도합니다.';
        }

        // 5. 설교 요약 및 질문 보호 (체험판 샘플 내용 유입 차단)
        const sampleSermonTag = '관리자 센터에서 교회의 이름과 설교 영상을 직접 바꿔보세요';
        if (!cleanSermonSummary || cleanSermonSummary.includes(sampleSermonTag)) {
            cleanSermonSummary = '성도님들과 함께 나눌 오늘의 말씀 요약을 입력해주세요.';
            cleanSermonQ1 = '오늘 말씀을 통해 깨달은 점은 무엇인가요?';
            cleanSermonQ2 = '내 삶에 어떻게 적용할 수 있을까요?';
            cleanSermonQ3 = '함께 기도하고 싶은 제목을 나누어보세요.';
        }

        // 6. 플랜 요금제 보호 (체험판 기간 정보가 유입되지 않도록)
        if (plan?.includes('trial')) {
            cleanPlan = plan.split('|').filter((p: string) => !p.startsWith('trial') && !p.startsWith('expires:') && !p.startsWith('usage:') && !p.startsWith('limit:')).join('|');
            if (!cleanPlan || cleanPlan === '') cleanPlan = 'premium';
        }
    }

    // ✅ DB에서 현재 해당 교회의 실제 ID를 정확히 조회 (교차 업데이트 방지 핵심)
    const { data: currentSettings } = await supabaseAdmin
        .from('church_settings')
        .select('id, plan, church_id')
        .eq('church_id', targetChurchId)
        .maybeSingle();

    // [강력 대응] targetChurchId가 jesus-in인데 DB에서 찾은 church_id와 다르면 절대 중단
    if (targetChurchId === 'jesus-in' && currentSettings && currentSettings.church_id !== 'jesus-in') {
        return NextResponse.json({ success: false, error: "보안 오류: 잘못된 교회 ID 매칭" }, { status: 403 });
    }

    let encodedPlan = (cleanPlan || 'free').split('|')[0];
    const oldPlanStr = currentSettings?.plan || '';

    // 체험판 정보 보존 (체험판인 경우만)
    if (targetChurchId !== 'jesus-in' && oldPlanStr.includes('trial')) {
        const expireMatch = oldPlanStr.match(/expires:([^|]+)/);
        const usageMatch = oldPlanStr.match(/usage:([^|]+)/);
        const limitMatch = oldPlanStr.match(/limit:([^|]+)/);
        if (expireMatch) encodedPlan += `|${expireMatch[0]}`;
        if (usageMatch) encodedPlan += `|${usageMatch[0]}`;
        if (limitMatch) encodedPlan += `|${limitMatch[0]}`;
    }

    if (allow_member_edit) encodedPlan += '|member_edit_on';
    if (event_poster_visible) encodedPlan += '|poster_on';
    if (event_poster_url) encodedPlan += `|poster_url:${event_poster_url}`;
    if (cleanColumnTitle) encodedPlan += `|column_title:${encodeURIComponent(cleanColumnTitle)}`;
    if (cleanColumnContent) encodedPlan += `|column_content:${encodeURIComponent(cleanColumnContent)}`;

    if (manual_sermon_url) encodedPlan += `|m_sermon_url:${encodeURIComponent(manual_sermon_url)}`;
    if (cleanSermonSummary) encodedPlan += `|s_summary:${encodeURIComponent(cleanSermonSummary)}`;
    if (cleanSermonQ1) encodedPlan += `|s_q1:${encodeURIComponent(cleanSermonQ1)}`;
    if (cleanSermonQ2) encodedPlan += `|s_q2:${encodeURIComponent(cleanSermonQ2)}`;
    if (cleanSermonQ3) encodedPlan += `|s_q3:${encodeURIComponent(cleanSermonQ3)}`;

    const baseData: any = {
        church_id: targetChurchId,
        church_name: cleanName,
        church_logo_url: cleanLogoUrl,
        church_url,
        app_subtitle: cleanSubtitle,
        plan: encodedPlan,
        community_visible: community_visible ?? true,
        sermon_url: cleanSermonUrl,
        custom_ccm_list,
        today_book_title,
        today_book_description,
        today_book_image_url
    };

    if (currentSettings) {
        baseData.id = currentSettings.id;
    } else if (targetChurchId === 'jesus-in') {
        baseData.id = 1;
    }

    // [보안] 체험판 업데이트 시 jesus-in의 ID(1)를 사용하는 것을 강제 차단
    if (targetChurchId !== 'jesus-in' && baseData.id === 1) {
        delete baseData.id; // 새 레코드로 생성되도록 유도
    }

    // 1차 시도: 모든 컬럼 포함하여 저장
    const { error: upsertError } = await supabaseAdmin
        .from('church_settings')
        .upsert({
            ...baseData,
            manual_sermon_url,
            sermon_summary: cleanSermonSummary,
            sermon_q1: cleanSermonQ1,
            sermon_q2: cleanSermonQ2,
            sermon_q3: cleanSermonQ3,
            event_poster_url,
            event_poster_visible: event_poster_visible ?? false,
            pastor_column_title: cleanColumnTitle,
            pastor_column_content: cleanColumnContent
        }, { onConflict: 'church_id' }); // ✅ ID가 아닌 church_id를 기준으로 업데이트하여 교차 오염 방지

    if (upsertError) {
        console.warn("[Settings POST] First attempt failed, retrying without new columns...", upsertError.message);

        // 2차 시도: 새 컬럼을 제외하고 plan 필드의 인코딩에 의존하여 저장
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

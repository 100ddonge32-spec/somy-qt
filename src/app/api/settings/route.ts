import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// [중요: 캐시 비활성화] 배포 시 정적 렌더링(Static Generation)으로 인해 이전 데이터가 캐싱되어
// 예수인교회 정보가 체험판으로 덮어씌워지는 버그(Vercel Build Cache) 원천 차단
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

// [표준화] 교회 식별자 정규화 (전역 함수로 분리하여 코드 중복 제거)
const normalizeId = (id: string | null) => {
    if (!id) return null; // [수정] 기본값 제거 (호출부에서 처리)
    const s = id.toLowerCase().trim();
    if (s === '예수인교회' || s === 'jesus-in' || s === '예수인') return 'jesus-in';
    return s;
};

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const churchId = searchParams.get('church_id');

    // [표준화] 요청받은 아이디 정규화 (기본값 설정)
    const targetChurchId = normalizeId(churchId) || 'jesus-in';

    const noCacheHeaders = {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
    };

    if (!targetChurchId) {
        return NextResponse.json({ settings: null }, { headers: noCacheHeaders });
    }

    // [신규] 'somy-main' 요청 시 절대적으로 하드코딩된 플랫폼 전용 소개 설정 반환 (DB 오염 원천 차단)
    if (targetChurchId === 'somy-main') {
        const platformData = {
            church_id: 'somy-main',
            church_name: '소미 플랫폼',
            app_subtitle: '교회의 디지털 전환을 돕습니다 (메인 플랫폼)',
            church_logo_url: '/somy.png',
            plan: 'premium',
            community_visible: true,
            sermon_summary: '소미 플랫폼에 오신 것을 환영합니다! \n\n이곳은 플랫폼 소개를 위한 메인 페이지입니다. 성도님들께서는 원하시는 교회의 전용 주소로 접속해주세요. (예: 주소창 끝에 /예수인교회 입력)',
            pastor_column_title: '✨ 환영합니다',
            pastor_column_content: '여기는 소미 플랫폼 메인입니다. 뒷주소에 자신의 교회 이름을 적어 소속 교회의 전용 화면으로 이동하세요. (슈퍼관리자는 이 화면도 직접 커스텀할 수 있습니다.)',
            manual_sermon_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' // Easter egg or platform promo URL
        };
        // DB에 저장하지 않고 바로 반환 (항상 깨끗한 상태 유지)
        return NextResponse.json({ settings: platformData }, { headers: noCacheHeaders });
    }

    // 1순위: church_id로 DB 검색
    let { data, error } = await supabaseAdmin
        .from('church_settings')
        .select('*')
        .eq('church_id', targetChurchId)
        .maybeSingle();

    // [신규] 'demo' 교회 요청 시: DB에 데이터가 없으면 하드코딩된 기본 체험판 설정 반환
    if (!data && targetChurchId === 'demo') {
        const demoData = {
            church_id: 'demo',
            church_name: '소미 체험 교회',
            app_subtitle: '✨ 소미 앱을 자유롭게 체험해보세요!',
            church_logo_url: '/somy.png',
            plan: 'premium',
            community_visible: true,
            allow_member_edit: false,
            sermon_summary: '이곳은 소미 앱 데모 체험 공간입니다.\n\n로그인 없이도 닉네임만 입력하면 은혜나눔·감사일기·큐티 등 모든 기능을 자유롭게 사용해볼 수 있습니다.\n\n실제 교회 데이터와는 완전히 분리된 안전한 체험 공간입니다. 😊',
            pastor_column_title: '🌱 소미 체험판에 오신 것을 환영합니다',
            pastor_column_content: '안녕하세요! 소미 앱 체험판에 오셨군요.\n\n이 공간은 소미의 모든 기능을 자유롭게 경험해볼 수 있는 데모 공간입니다. 회원가입이나 복잡한 인증 없이, 원하시는 닉네임만 입력하면 바로 시작할 수 있습니다.\n\n큐티 묵상, 은혜나눔 게시판, 감사일기, 찬양 플레이어 등 실제 교회에서 사용하는 모든 기능을 경험해보세요. 데모 교회의 다른 방문자들과 자유롭게 소통할 수도 있습니다.\n\n마음에 드셨다면, 소속 교회에 소미 앱 도입을 제안해보세요! 😊',
            today_verse_text: '여호와는 나의 목자시니 내게 부족함이 없으리로다',
            today_verse_ref: '시편 23:1',
            event_poster_url: '',
            event_poster_visible: false,
        };
        return NextResponse.json({ settings: demoData }, { headers: noCacheHeaders });
    }

    // 2순위: jesus-in에 한해서는 id=1 레코드를 마지막 보루로 시도 (호환성)
    if (!data && targetChurchId === 'jesus-in') {
        const { data: fallback } = await supabaseAdmin
            .from('church_settings')
            .select('*')
            .eq('id', 1)
            .maybeSingle();
        if (fallback) {
            data = fallback;

            // [자동 복구/Self-Healing] 과거 버그로 인해 ID 1번(메인)의 church_id가 체험판으로 오염된 경우 즉시 복구
            if (data.church_id && data.church_id !== 'jesus-in') {
                console.log(`[API Settings] CRITICAL: ID 1 is corrupted with church_id ${data.church_id}. Auto-healing...`);
                await supabaseAdmin.from('church_settings').update({
                    church_id: 'jesus-in',
                    church_name: '예수인교회'
                }).eq('id', 1);

                data.church_id = 'jesus-in';
                data.church_name = '예수인교회';
            }
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

        // 7. 오늘의 말씀 커스텀 필드
        if (!data.today_verse_text && planStr.includes('tv_text:')) {
            const match = planStr.match(/tv_text:([^|]+)/);
            if (match) data.today_verse_text = decodeURIComponent(match[1]);
        }
        if (!data.today_verse_ref && planStr.includes('tv_ref:')) {
            const match = planStr.match(/tv_ref:([^|]+)/);
            if (match) data.today_verse_ref = decodeURIComponent(match[1]);
        }

        // 8. 오늘의 한줄 (명언)
        if (planStr.includes('today_quote:')) {
            const match = planStr.match(/today_quote:([^|]+)/);
            if (match) data.today_quote = decodeURIComponent(match[1]);
        }

        data.plan = data.plan.split('|')[0]; // 원래 plan 값만 추출 (ui용)
    }

    return NextResponse.json({ settings: data }, { headers: noCacheHeaders });
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
        today_verse_text, // [추가] 커스텀 오늘의 말씀 텍스트
        today_verse_ref,  // [추가] 커스텀 오늘의 말씀 구절
        church_id: body_church_id,
        requester_id,
        requester_email: body_requester_email // [추가] 클라이언트에서 넘어온 이메일
    } = body;

    const targetChurchId = body_church_id;

    if (!targetChurchId) {
        return NextResponse.json({ success: false, error: "church_id가 유효하지 않습니다." }, { status: 400 });
    }

    // [0순위 보안] 권한 검증 (Gatekeeper Logic)
    const HARDCODED_ADMINS = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "pastorbaek@kakao.com,kakao_4761026797@kakao.somy-qt.local").toLowerCase().split(',').map(e => e.trim());

    if (!requester_id) {
        return NextResponse.json({ success: false, error: "권한이 없습니다. (No Requester ID)" }, { status: 401 });
    }

    // 1. 요청자 프로필 정보 로드
    const { data: requesterProfile } = await supabaseAdmin
        .from('profiles')
        .select('email, full_name')
        .eq('id', requester_id)
        .maybeSingle();

    // [보정] 프로필에 이메일이 없는데 클라이언트가 보냈다면 즉시 업데이트 시도 (동기화 보강)
    let reqEmail = (requesterProfile?.email || body_requester_email || '').toLowerCase().trim();
    if (requester_id && !requesterProfile?.email && body_requester_email) {
        await supabaseAdmin.from('profiles').update({ email: body_requester_email }).eq('id', requester_id);
    }

    const normTargetId = normalizeId(targetChurchId) || 'jesus-in';

    // 2. 관리자 권한 조회 (더욱 포괄적이고 안전한 방식)
    // 1) 유저 ID로 찾기
    const { data: qById } = await supabaseAdmin.from('app_admins').select('*').eq('user_id', requester_id);
    // 2) 이메일로 찾기 (백업)
    const { data: qByEmail } = reqEmail ? await supabaseAdmin.from('app_admins').select('*').eq('email', reqEmail) : { data: [] };

    const adminsForRequester = [...(qById || []), ...(qByEmail || [])];
    const uniqueAdmins = Array.from(new Map(adminsForRequester.map(a => [a.id, a])).values());

    // [핵심 해결] 정확한 매칭 로직
    // 1. 슈퍼어드민인지 확인 (권한이 super_admin이거나 소속이 기본/메인인 경우 포함)
    const superAdmin = uniqueAdmins.find(a => a.role === 'super_admin' || ['default', 'somy-main'].includes(a.church_id?.toLowerCase()));
    // 2. 현재 요청한 교회(targetChurchId)의 관리자인지 확인
    const churchAdmin = uniqueAdmins.find(a => normalizeId(a.church_id) === normTargetId);

    const adminInfo = superAdmin || churchAdmin;

    // [추가] 관리자 테이블에 user_id가 매칭되지 않았다면 즉시 업데이트 (다음 요청부터 id 매칭 성공하도록)
    if (qByEmail && qByEmail.length > 0 && !qById?.length) {
        for (const adm of qByEmail) {
            if (!adm.user_id || adm.user_id !== requester_id) {
                console.log(`[Settings-Fix] Auto-linking admin user_id for: ${adm.email}`);
                await supabaseAdmin.from('app_admins').update({ user_id: requester_id }).eq('id', adm.id);
            }
        }
    }

    // 3. 마스터 권한 여부 (전역 - Profile 이름 기반 최후의 보루)
    const isGlobalMaster = (reqEmail && HARDCODED_ADMINS.includes(reqEmail)) ||
        !!superAdmin ||
        (requesterProfile?.full_name === '백동희' || requesterProfile?.full_name === '동희');

    // 5. 권한 검증 로직 (강화: 소속교회 관리자는 자기 교회만 수정 가능)
    if (!isGlobalMaster) {
        if (!adminInfo) {
            const reason = (uniqueAdmins && uniqueAdmins.length > 0)
                ? `소속 교회 정보가 다릅니다 (보유: ${uniqueAdmins.map(a => a.church_id).join(', ')} / 요청: ${targetChurchId})`
                : `관리자 권한 정보를 찾을 수 없습니다. (ID:${requester_id.substring(0, 5)}... / Email:${reqEmail || 'N/A'})`;

            console.error(`[Security Alert] Access Denied. User: ${requester_id}, Email: ${reqEmail}, Target: ${normTargetId}, Reason: ${reason}`);
            return NextResponse.json({ success: false, error: reason }, { status: 403 });
        }

        // [추가] 관리자가 자신의 소속이 아닌 다른 일반 교회를 고치려고 시도하는 경우 차단
        // 단, 마스트(isGlobalMaster)는 이미 위에서 통과되었으므로 일반 관리자만 체크합니다.
        if (normalizeId(adminInfo.church_id) !== normTargetId) {
            return NextResponse.json({ success: false, error: "해당 교회의 관리 권한이 없습니다." }, { status: 403 });
        }
    }

    // [보안] 데이터 정교화 (유효성 검사 및 기본값 설정)
    let cleanPlan = plan || 'free';
    let cleanName = church_name;
    let cleanSubtitle = app_subtitle || '말씀과 기도로 거룩해지는 공동체';
    let cleanColumnTitle = pastor_column_title || '🙏 오늘의 목양 메시지';
    let cleanColumnContent = pastor_column_content;
    let cleanTodayVerseText = today_verse_text;
    let cleanTodayVerseRef = today_verse_ref;
    let cleanLogoUrl = church_logo_url;
    let cleanSermonUrl = sermon_url;
    let cleanSermonSummary = sermon_summary;
    let cleanSermonQ1 = sermon_q1;
    let cleanSermonQ2 = sermon_q2;
    let cleanSermonQ3 = sermon_q3;

    if (targetChurchId === 'jesus-in') {
        if (!cleanName) cleanName = '예수인교회';
        if (!cleanLogoUrl) cleanLogoUrl = 'https://lfjrfyylsxhvwosdpujv.supabase.co/storage/v1/object/public/church-assets/jesus-in-logo.png';
    }

    // ✅ DB에서 현재 해당 교회의 실제 ID를 정확히 조회 (교차 업데이트 방지 핵심)
    // [중요] 반드시 표준화된 ID(normTargetId)를 사용하여 조회해야 데이터 파편화를 막을 수 있습니다.
    const { data: currentSettings } = await supabaseAdmin
        .from('church_settings')
        .select('id, plan, church_id')
        .eq('church_id', normTargetId)
        .maybeSingle();

    // [강력 격리] jesus-in(본교회) 보호 및 트라이얼 정보 유입 원천 차단
    // 1. 요청한 church_id가 jesus-in인데 DB에서 찾은 church_id와 다르면 절대 중단 (아이디 탈취 방지)
    if (normTargetId === 'jesus-in' && !isGlobalMaster) {
        if (currentSettings && normalizeId(currentSettings.church_id) !== 'jesus-in') {
            return NextResponse.json({ success: false, error: "보안 오류: 잘못된 교회 ID 매칭" }, { status: 403 });
        }
    }

    // 2. [핵심 수정] 타교회 요청인데 조회된 레코드가 ID 1번(메인)인 경우 원천 차단
    if (normTargetId !== 'jesus-in') {
        const isActuallyMain = currentSettings?.id === 1 || currentSettings?.church_id === 'jesus-in';
        if (isActuallyMain) {
            console.error(`[Security Critical] Interception attempt detected! Church ${normTargetId} tried to hit Yesuin record (ID 1).`);
            return NextResponse.json({ success: false, error: "보안 정책 위반: 타교회는 메인 데이터를 수정할 수 없습니다." }, { status: 403 });
        }
    }

    let encodedPlan = (cleanPlan || 'free').split('|')[0];

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

    if (cleanTodayVerseText) encodedPlan += `|tv_text:${encodeURIComponent(cleanTodayVerseText)}`;
    if (cleanTodayVerseRef) encodedPlan += `|tv_ref:${encodeURIComponent(cleanTodayVerseRef)}`;

    const safeBaseData: any = {
        church_id: normTargetId, // [필수] 항상 표준화된 아이디로 저장하여 파편화 방지
        church_name: cleanName,
        church_logo_url: cleanLogoUrl,
        church_url,
        app_subtitle: cleanSubtitle,
        plan: encodedPlan,
        community_visible: community_visible ?? true,
        sermon_url: cleanSermonUrl
    };

    // [최후의 보루] ID 매칭 강제화 및 물리적 격리
    if (normTargetId === 'jesus-in') {
        safeBaseData.id = 1; // 예수인교회는 무조건 ID 1 고정
    } else if (currentSettings) {
        // [강력 대응] 다른 교회의 업데이트가 ID 1번을 건드리는 것을 물리적으로 차단 (이중 체크)
        if (currentSettings.id === 1) {
            return NextResponse.json({ success: false, error: "보안 정책 위반: 잘못된 ID 타겟팅" }, { status: 403 });
        }
        safeBaseData.id = currentSettings.id;
    } else {
        // [신규] currentSettings가 없으면 새로운 레코드이므로 ID를 절대 포함하지 않음
        delete safeBaseData.id;
    }

    const advancedData = {
        ...safeBaseData,
        custom_ccm_list,
        today_book_title,
        today_book_description,
        today_book_image_url,
        manual_sermon_url,
        sermon_summary: cleanSermonSummary,
        sermon_q1: cleanSermonQ1,
        sermon_q2: cleanSermonQ2,
        sermon_q3: cleanSermonQ3,
        event_poster_url,
        event_poster_visible: event_poster_visible ?? false,
        pastor_column_title: cleanColumnTitle,
        pastor_column_content: cleanColumnContent
    };

    // 1차 시도: 모든 컬럼 포함하여 저장
    const { error: upsertError } = await supabaseAdmin
        .from('church_settings')
        .upsert(advancedData); // 기본 ID 기반 upsert (안전)

    if (upsertError) {
        console.warn("[Settings POST] First attempt failed, retrying without new columns...", upsertError.message);

        // 2차 시도: 새 컬럼을 제외하고 plan 필드의 인코딩에 의존하여 기본 컬럼만 저장
        const { error: secondError } = await supabaseAdmin
            .from('church_settings')
            .upsert(safeBaseData);

        if (secondError) {
            console.error("[Settings POST Error]", secondError);
            return NextResponse.json({ success: false, error: secondError.message }, { status: 500 });
        }
    }

    return NextResponse.json({ success: true, settings: advancedData });
}

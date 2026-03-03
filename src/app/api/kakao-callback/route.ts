import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

const KAKAO_CLIENT_ID = 'c205e6ad80a115b72fc7b53749e204d9';
const KAKAO_CLIENT_SECRET = 'QWgDkVCdUj74tqYCpGUsks4wbuLY1h0R';

export async function GET(req: NextRequest) {
    const host = req.headers.get('host') || 'somy-qt.vercel.app';
    const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
    const APP_URL = `${protocol}://${host}`;

    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error || !code) {
        return NextResponse.redirect(`${APP_URL}?error=kakao_cancelled`);
    }

    // STEP 1: 카카오 코드 → 액세스 토큰 교환
    let tokenData: { access_token?: string; error?: string };
    try {
        const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: KAKAO_CLIENT_ID,
                client_secret: KAKAO_CLIENT_SECRET,
                redirect_uri: `${APP_URL}/api/kakao-callback`,
                code,
            }),
        });
        tokenData = await tokenRes.json();
    } catch (e) {
        return NextResponse.redirect(`${APP_URL}?error=step1_fetch_failed`);
    }

    if (!tokenData.access_token) {
        return NextResponse.redirect(`${APP_URL}?error=step1_no_token`);
    }

    // STEP 2: 카카오 사용자 정보
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let kakaoUser: any;
    try {
        const profileRes = await fetch('https://kapi.kakao.com/v2/user/me', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        kakaoUser = await profileRes.json();
    } catch (e) {
        return NextResponse.redirect(`${APP_URL}?error=step2_profile_failed`);
    }

    const kakaoId = String(kakaoUser.id);
    const nickname: string | null = (kakaoUser.kakao_account?.profile?.nickname &&
        kakaoUser.kakao_account.profile.nickname !== '성도' &&
        kakaoUser.kakao_account.profile.nickname.length >= 2)
        ? kakaoUser.kakao_account.profile.nickname
        : null;
    const profileImage: string | null = kakaoUser.kakao_account?.profile?.profile_image_url ?? null;
    const syntheticEmail = `kakao_${kakaoId}@kakao.somy-qt.local`;

    // ★ STEP 2.5: [핵심] 관리자 여부 확인 - 관리자가 아니면 즉시 차단!
    // app_admins 테이블에서 이 카카오 계정이 관리자인지 먼저 확인
    const isAlreadyKnownUser = (await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }))
        .data?.users?.find((u) => u.email === syntheticEmail);

    let isAdminUser = false;

    // ★ 1순위: 하드코딩 슈퍼관리자 이메일 체크 (DB 조회 전에 먼저 확인)
    // admin/route.ts의 HARDCODED_ADMINS와 동일 로직
    const HARDCODED_ADMINS = (
        process.env.NEXT_PUBLIC_ADMIN_EMAIL ||
        'pastorbaek@kakao.com,kakao_4761026797@kakao.somy-qt.local'
    ).toLowerCase().split(',').map((e: string) => e.trim());

    if (HARDCODED_ADMINS.includes(syntheticEmail.toLowerCase())) {
        console.log(`[Kakao] ✅ 하드코딩 슈퍼관리자 로그인: ${syntheticEmail}`);
        isAdminUser = true;
    }

    // ★ 2순위: 이름 체크 (혜시 만약 kakaoId가 바뀔었을 경우 대비)
    if (!isAdminUser) {
        const IS_BOSS = nickname?.trim() === '백동희' || nickname?.trim() === '동희';
        if (IS_BOSS) {
            console.log(`[Kakao] ✅ 슈퍼관리자 이름 확인: ${nickname}`);
            isAdminUser = true;
        }
    }

    // ★ 3순위: app_admins DB 테이블 조회
    if (!isAdminUser) {
        if (isAlreadyKnownUser) {
            const { data: adminByUserId } = await supabaseAdmin.from('app_admins')
                .select('role').eq('user_id', isAlreadyKnownUser.id).maybeSingle();
            const { data: adminByEmail } = await supabaseAdmin.from('app_admins')
                .select('role').eq('email', syntheticEmail).maybeSingle();
            isAdminUser = !!(adminByUserId || adminByEmail);
        } else {
            const { data: adminByEmail } = await supabaseAdmin.from('app_admins')
                .select('role').eq('email', syntheticEmail).maybeSingle();
            isAdminUser = !!adminByEmail;
        }
    }

    // ★ 3순위: [임계] 일반 유저도 일단 통과 (로그온 후 프로필 연결 단계에서 처리)
    // 기존에는 관리자만 카카오 로그인이 가능하게 막았으나, 
    // 새로운 관리자가 처음 로그인할 때 본인임을 증명할 기회가 없어지는 '닭과 달걀' 문제를 해결하기 위해 개방합니다.
    console.log(`[Kakao] 로그인 진행: nickname=${nickname}, isAdmin=${isAdminUser}`);

    // STEP 3: Supabase Auth 사용자 생성 또는 업데이트 (관리자만 이 지점 도달)
    const { error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: syntheticEmail,
        email_confirm: true,
        user_metadata: {
            full_name: nickname,
            name: nickname,
            avatar_url: profileImage,
            kakao_id: kakaoId,
            provider: 'kakao',
        },
    });

    if (createErr && !createErr.message.includes('already')) {
        return NextResponse.redirect(`${APP_URL}?error=step3_${encodeURIComponent(createErr.message.slice(0, 50))}`);
    }

    // STEP 4: 사용자 ID 확보
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const supabaseUser = usersData?.users?.find((u) => u.email === syntheticEmail);

    if (supabaseUser) {
        // 메타데이터 최신화
        await supabaseAdmin.auth.admin.updateUserById(supabaseUser.id, {
            user_metadata: { full_name: nickname, name: nickname, avatar_url: profileImage },
        });

        const { data: profileById } = await supabaseAdmin.from('profiles').select('*').eq('id', supabaseUser.id).maybeSingle();

        if (!profileById) {
            // 관리자 프로필 생성 (이름 매칭으로 기존 데이터 이관)
            const isGenericName = !nickname || nickname.length < 2;

            if (!isGenericName && nickname) {
                const cleanNickname = nickname.replace(/\s+/g, '').toLowerCase();
                const { data: nameCandidates } = await supabaseAdmin.from('profiles')
                    .select('*')
                    .not('full_name', 'is', null)
                    .neq('id', supabaseUser.id);

                let match = null;
                if (nameCandidates) {
                    const matches = nameCandidates.filter(c => {
                        const cleanDbName = (c.full_name || '').replace(/\s+/g, '').toLowerCase();
                        return cleanDbName === cleanNickname;
                    });
                    if (matches.length > 0) {
                        match = matches.find(m => m.email?.includes('@church.local')) ||
                            (matches.length === 1 ? matches[0] : null);
                    }
                }

                if (match) {
                    console.log(`[Kakao Admin] 기존 프로필 이관: ${match.full_name}`);
                    const { error: insertErr } = await supabaseAdmin.from('profiles').insert({
                        ...match,
                        id: supabaseUser.id,
                        email: syntheticEmail,
                        avatar_url: match.avatar_url || profileImage,
                        is_approved: isAdminUser  // 관리자만 자동 승인
                    });
                    if (!insertErr && match.id !== supabaseUser.id) {
                        await supabaseAdmin.from('profiles').delete().eq('id', match.id);
                    }
                } else {
                    // 관리자 신규 프로필 생성 (하드코딩된 예수인교회 대신 실제 관리자 정보 참조)
                    const { data: fallbackAdminData } = await supabaseAdmin.from('app_admins').select('church_id').eq('email', syntheticEmail).maybeSingle();

                    await supabaseAdmin.from('profiles').insert({
                        id: supabaseUser.id,
                        full_name: nickname,
                        avatar_url: profileImage,
                        email: syntheticEmail,
                        church_id: fallbackAdminData?.church_id ?? 'somy-main', // 동적 매핑
                        is_approved: isAdminUser,  // 관리자만 자동 승인
                    });
                }
            }
        } else {
            // 기존 관리자 프로필 최신화
            const updateData: any = {};
            const isManualUpload = (profileById.avatar_url || '').includes('supabase.co');
            if (!isManualUpload && profileImage) updateData.avatar_url = profileImage;
            if (profileById.full_name === '성도' && nickname) updateData.full_name = nickname;
            // 관리자는 is_approved 항상 true 보장
            if (!profileById.is_approved && isAdminUser) updateData.is_approved = true;
            if (Object.keys(updateData).length > 0) {
                await supabaseAdmin.from('profiles').update(updateData).eq('id', supabaseUser.id);
            }
        }
    }

    // STEP 5: 매직 링크 생성
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: syntheticEmail,
        options: { redirectTo: `${APP_URL}/auth/callback` },
    });

    if (linkErr) {
        return NextResponse.redirect(`${APP_URL}?error=step5_${encodeURIComponent(linkErr.message.slice(0, 50))}`);
    }

    const hashedToken = linkData?.properties?.hashed_token;
    if (!hashedToken) {
        return NextResponse.redirect(`${APP_URL}?error=step5_no_token`);
    }

    return NextResponse.redirect(`${APP_URL}/auth/callback?token=${encodeURIComponent(hashedToken)}`);
}

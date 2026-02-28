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
    const nickname: string | null = (kakaoUser.kakao_account?.profile?.nickname && kakaoUser.kakao_account.profile.nickname !== '성도')
        ? kakaoUser.kakao_account.profile.nickname
        : null;
    const profileImage: string | null = kakaoUser.kakao_account?.profile?.profile_image_url ?? null;
    const syntheticEmail = `kakao_${kakaoId}@kakao.somy-qt.local`;

    // STEP 3: Supabase 사용자 생성 또는 업데이트
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

    // STEP 4: 사용자 ID 확보 (신규 또는 기존)
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const supabaseUser = usersData?.users?.find((u) => u.email === syntheticEmail);

    if (supabaseUser) {
        // 이름/사진 최신화 (Auth 메타데이터만)
        await supabaseAdmin.auth.admin.updateUserById(supabaseUser.id, {
            user_metadata: { full_name: nickname, name: nickname, avatar_url: profileImage },
        });

        // 이름으로 매칭 시도 (기본 닉네임이 유의미할 때만)
        const isGenericName = !nickname || nickname === '성도' || nickname === '사용자' || nickname.length < 2;

        // ✅ 프로필 매칭 및 병합 로직 (성도 중복 방지 최적화)
        const { data: profileById } = await supabaseAdmin.from('profiles').select('*').eq('id', supabaseUser.id).maybeSingle();

        if (!profileById) {
            // 1. 기존에 등록된 성도가 있는지 확인 (이메일 또는 이름 매칭)
            let match = null;

            if (!isGenericName) {
                const cleanNickname = nickname!.replace(/\s+/g, '').toLowerCase();
                const { data: nameCandidates } = await supabaseAdmin.from('profiles')
                    .select('*')
                    .not('full_name', 'is', null);

                if (nameCandidates) {
                    const matches = nameCandidates.filter(c => {
                        const cleanDbName = (c.full_name || '').replace(/\s+/g, '').toLowerCase();
                        return cleanDbName === cleanNickname;
                    });

                    // [개선] 동일 이름이 여러 명이라면, 아직 주인이 없는(가계정 @church.local) 정보를 우선적으로 찾음
                    if (matches.length > 0) {
                        match = matches.find(m => m.email?.includes('@church.local') && !m.id.includes('-')) ||
                            matches.find(m => m.email?.includes('@church.local')) ||
                            (matches.length === 1 ? matches[0] : null);
                    }
                }
            }

            if (match) {
                console.log(`[Kakao Callback] 매칭 발견: ${match.full_name}. 기존 데이터를 신규 계정(${supabaseUser.id})으로 이관합니다.`);
                // 1. 기존 가계정(@church.local) 데이터를 기반으로 새 프로필 생성
                const { error: insertErr } = await supabaseAdmin.from('profiles')
                    .insert({
                        ...match,
                        id: supabaseUser.id,
                        email: syntheticEmail,
                        avatar_url: match.avatar_url || profileImage, // 기존 사진 우선
                        is_approved: true // 매칭된 계정은 즉시 승인 처리 (관리자가 이미 신뢰한 데이터)
                    });

                if (insertErr) {
                    console.error('[Kakao Callback] 프로필 매칭 이관 실패:', insertErr.message);
                } else {
                    // 2. 이관 성공 시 기존 가계정 삭제
                    await supabaseAdmin.from('profiles').delete().eq('id', match.id);
                }
            } else {
                // [핵심] 일치하는 성도가 없고, 이름도 '성도'처럼 너무 일반적이면 유령 계정 생성을 건너뜀
                if (isGenericName) {
                    console.log('[Kakao Callback] 유의미한 정보가 없어 프로필 생성을 스킵합니다.');
                } else {
                    // 이름이 명확하면 신규 생성
                    await supabaseAdmin.from('profiles').insert({
                        id: supabaseUser.id,
                        full_name: nickname,
                        avatar_url: profileImage,
                        email: syntheticEmail,
                        church_id: 'jesus-in',
                        is_approved: false,
                    });
                }
            }
        } else {
            // 이미 프로필이 있음 -> 정보 최신화 (사진이 이미 있으면 덮어쓰지 않음: 김부장의 센스)
            const updateData: any = {};

            // 기존 사진이 없거나 카카오 기본 이미지가 아닌 경우만 업데이트 고려 (사용자가 직접 올린 건 'supabase.co' 포함됨)
            const currentAvatar = profileById.avatar_url || '';
            const isManualUpload = currentAvatar.includes('supabase.co');

            if (!isManualUpload && profileImage) {
                updateData.avatar_url = profileImage;
            }

            if (profileById.full_name === '성도' && !isGenericName) {
                updateData.full_name = nickname;
            }

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

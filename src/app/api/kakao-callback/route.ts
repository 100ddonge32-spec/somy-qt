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

    // STEP 3: Supabase Auth 사용자 생성 또는 업데이트
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
            // 닉네임이 유의미한 경우에만 처리
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
                        // 가계정(church.local) 우선 매칭
                        match = matches.find(m => m.email?.includes('@church.local')) ||
                            (matches.length === 1 ? matches[0] : null);
                    }
                }

                if (match) {
                    // ✅ 매칭 성공 → 즉시 승인 이관
                    console.log(`[Kakao] 매칭 성공: ${match.full_name} → 즉시 승인 이관`);
                    const { error: insertErr } = await supabaseAdmin.from('profiles').insert({
                        ...match,
                        id: supabaseUser.id,
                        email: syntheticEmail,
                        avatar_url: match.avatar_url || profileImage,
                        is_approved: true
                    });
                    if (!insertErr) {
                        await supabaseAdmin.from('profiles').delete().eq('id', match.id);
                    }
                } else {
                    // ✅ 매칭 실패 → [핵심 변경] 미승인 최소 프로필 생성 (정보 입력 화면 유도)
                    console.log(`[Kakao] 매칭 실패 (${nickname}) → 미승인 상태로 생성. 정보 입력 필요.`);
                    await supabaseAdmin.from('profiles').insert({
                        id: supabaseUser.id,
                        full_name: nickname,
                        avatar_url: profileImage,
                        email: syntheticEmail,
                        church_id: 'jesus-in',
                        is_approved: false, // ← 관리자 명단 불일치 → 미승인
                    });
                }
            }
            // 이름이 너무 일반적이면 프로필 생성 스킵 (정보 입력 화면에서 직접 처리)
        } else {
            // 이미 프로필 있음 → 사진만 최신화
            const updateData: any = {};
            const isManualUpload = (profileById.avatar_url || '').includes('supabase.co');
            if (!isManualUpload && profileImage) updateData.avatar_url = profileImage;
            if (profileById.full_name === '성도' && nickname) updateData.full_name = nickname;
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

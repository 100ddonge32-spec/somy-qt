import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

const KAKAO_CLIENT_ID = 'c205e6ad80a115b72fc7b53749e204d9';
const KAKAO_CLIENT_SECRET = 'QWgDkVCdUj74tqYCpGUsks4wbuLY1h0R';
const APP_URL = 'https://somy-qt.vercel.app';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        if (error || !code) {
            return NextResponse.redirect(`${APP_URL}?error=kakao_cancelled`);
        }

        // 1. 카카오 코드 → 액세스 토큰 교환
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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tokenData: any = await tokenRes.json();

        if (!tokenData.access_token) {
            console.error('Kakao token exchange failed:', tokenData);
            return NextResponse.redirect(`${APP_URL}?error=kakao_token_failed`);
        }

        // 2. 카카오 사용자 정보 가져오기 (닉네임, 프로필 사진만)
        const profileRes = await fetch('https://kapi.kakao.com/v2/user/me', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const kakaoUser: any = await profileRes.json();
        const kakaoId = String(kakaoUser.id);
        const nickname: string = kakaoUser.kakao_account?.profile?.nickname ?? '성도';
        const profileImage: string | null = kakaoUser.kakao_account?.profile?.profile_image_url ?? null;

        // 3. 이메일 권한 없이 카카오 ID 기반 가상 이메일 생성
        const syntheticEmail = `kakao_${kakaoId}@kakao.somy-qt.local`;

        // 4. 기존 사용자 찾기 또는 새로 생성
        const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
        const existingUser = usersData?.users?.find((u) => u.email === syntheticEmail);

        if (!existingUser) {
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

            if (createErr) {
                console.error('Supabase user creation failed:', createErr);
                return NextResponse.redirect(`${APP_URL}?error=user_creation_failed`);
            }
        } else {
            await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
                user_metadata: {
                    full_name: nickname,
                    name: nickname,
                    avatar_url: profileImage,
                    kakao_id: kakaoId,
                },
            });
        }

        // 5. 매직 링크로 자동 로그인 세션 생성
        const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
            type: 'magiclink',
            email: syntheticEmail,
            options: { redirectTo: APP_URL },
        });

        if (linkErr) {
            console.error('Magic link generation failed:', linkErr);
            return NextResponse.redirect(`${APP_URL}?error=session_failed`);
        }

        const actionLink = linkData?.properties?.action_link;
        if (!actionLink) {
            console.error('No action_link in magic link response');
            return NextResponse.redirect(`${APP_URL}?error=no_action_link`);
        }

        // 6. 매직 링크로 리다이렉트 → Supabase가 자동 로그인 처리 후 앱으로 돌아옴
        return NextResponse.redirect(actionLink);

    } catch (err) {
        console.error('Kakao callback unexpected error:', err);
        return NextResponse.redirect(`${APP_URL}?error=unknown`);
    }
}

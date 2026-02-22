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
    const nickname: string = kakaoUser.kakao_account?.profile?.nickname ?? '성도';
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
        // 이름/사진 최신화
        await supabaseAdmin.auth.admin.updateUserById(supabaseUser.id, {
            user_metadata: { full_name: nickname, name: nickname, avatar_url: profileImage },
        });

        // ✅ STEP 4-1: profiles 테이블에 행 자동 생성
        // 없으면 insert (is_approved: false로 시작), 있으면 이름/사진만 업데이트
        const { data: existingProfile } = await supabaseAdmin
            .from('profiles')
            .select('id, is_approved')
            .eq('id', supabaseUser.id)
            .single();

        if (!existingProfile) {
            // 신규 사용자 → profiles 행 생성 (승인 대기)
            const { error: insertErr } = await supabaseAdmin
                .from('profiles')
                .insert({
                    id: supabaseUser.id,
                    full_name: nickname,
                    avatar_url: profileImage,
                    email: syntheticEmail,
                    church_id: 'jesus-in',
                    is_approved: false,
                });
            if (insertErr) {
                console.error('[Kakao Callback] profiles insert 실패:', insertErr.message);
            } else {
                console.log('[Kakao Callback] 신규 성도 profiles 행 생성 완료');
            }
        } else {
            // 기존 사용자 → 이름/사진만 업데이트 (is_approved 건드리지 않음)
            await supabaseAdmin
                .from('profiles')
                .update({ full_name: nickname, avatar_url: profileImage })
                .eq('id', supabaseUser.id);
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

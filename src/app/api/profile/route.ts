import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

// Base64 형태의 아바타 이미지를 Supabase Storage(1년 캐시)로 업로드하고 공개 URL로 변환하는 헬퍼
async function uploadBase64AvatarIfNeeded(userId: string, avatarUrl?: string | null): Promise<string | undefined | null> {
    if (!avatarUrl || !avatarUrl.startsWith('data:image/')) {
        return avatarUrl;
    }
    try {
        const matches = avatarUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) return avatarUrl;

        const contentType = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        const ext = contentType.includes('png') ? 'png' : 'jpg';
        const filePath = `avatars/${userId}-${Date.now()}.${ext}`;

        await supabaseAdmin.storage.createBucket('member-photos', { public: true }).catch(() => {});

        const { error: uploadError } = await supabaseAdmin.storage
            .from('member-photos')
            .upload(filePath, buffer, {
                contentType,
                cacheControl: '31536000', // 1년 브라우저/CDN 캐싱
                upsert: true
            });

        if (uploadError) {
            console.error('[Profile API] Avatar storage upload error:', uploadError);
            return avatarUrl;
        }

        const { data: { publicUrl } } = supabaseAdmin.storage
            .from('member-photos')
            .getPublicUrl(filePath);

        return publicUrl;
    } catch (err) {
        console.error('[Profile API] Base64 avatar conversion failed:', err);
        return avatarUrl;
    }
}

export async function POST(req: NextRequest) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        console.error("[Profile API] Missing environment variables");
        return NextResponse.json({
            error: '서버 설정 오류: API 키가 누락되었습니다. (Vercel 환경변수를 확인해주세요)',
            details: { url: !!url, key: !!key }
        }, { status: 500 });
    }

    try {
        const body = await req.json();
        const { user_id, profileData } = body;

        if (!user_id) {
            return NextResponse.json({ error: 'User ID is missing' }, { status: 400 });
        }

        console.log(`[Profile Update] Updating for: ${user_id}`);

        // Base64 이미지가 전달된 경우 Storage URL로 변환하여 DB 전송량(Egress) 절감
        if (profileData?.avatar_url && profileData.avatar_url.startsWith('data:image/')) {
            profileData.avatar_url = await uploadBase64AvatarIfNeeded(user_id, profileData.avatar_url);
        }

        // 1. 휴대폰 중복 체크 및 통합 로직 (선택사항)
        if (profileData.phone) {
            const cleanInputPhone = profileData.phone.replace(/[^0-9]/g, '');
            const formattedInputPhone = cleanInputPhone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');

            // 관리자가 등록한 동일한 전번의 가계정 로우가 있는지 확인
            const { data: duplicate } = await supabaseAdmin
                .from('profiles')
                .select('*')
                .or(`phone.eq.${cleanInputPhone},phone.eq.${formattedInputPhone}`)
                .neq('id', user_id)
                .or('email.ilike.%@church.local,email.ilike.%@noemail.local')
                .maybeSingle();

            if (duplicate) {
                console.log(`[Profile Update] Duplicate found, merging: ${duplicate.email}`);
                // 현재 내 로우 삭제 (있다면)
                await supabaseAdmin.from('profiles').delete().eq('id', user_id).neq('email', duplicate.email);

                // 관리자 로우를 내 ID로 업데이트 (데이터 정제)
                const safeMergedData = { ...profileData, id: user_id };
                if ('is_birthdate_lunar' in safeMergedData) {
                    delete (safeMergedData as any).is_birthdate_lunar;
                }
                // [수정] 시스템 필드 제외
                delete (safeMergedData as any).created_at;

                if (safeMergedData.birthdate === "") {
                    safeMergedData.birthdate = null;
                }

                const { error: mergeError } = await supabaseAdmin
                    .from('profiles')
                    .update(safeMergedData)
                    .eq('email', duplicate.email);

                if (mergeError) throw mergeError;
                return NextResponse.json({ success: true, merged: true, avatar_url: safeMergedData.avatar_url });
            }
        }

        // 2. 일반 업데이트 (데이터 정제: DB에 없는 컬럼 제외)
        const safeData = { ...profileData };
        if ('is_birthdate_lunar' in safeData) {
            delete (safeData as any).is_birthdate_lunar;
        }
        // [수정] 시스템 필드인 created_at과 id는 업데이트 대상에서 제외 (타임스탬프 형식 오류 방지)
        delete (safeData as any).created_at;
        delete (safeData as any).id;

        // 빈 문자열로 날짜가 들어오면 null로 치환 (DB 에러 방지)
        if (safeData.birthdate === "") {
            safeData.birthdate = null;
        }

        const { error } = await supabaseAdmin
            .from('profiles')
            .update(safeData)
            .eq('id', user_id);

        if (error) throw error;

        return NextResponse.json({ success: true, avatar_url: safeData.avatar_url });
    } catch (err: any) {
        console.error('[Profile Update Error]', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get('user_id');

    if (!user_id) {
        return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', user_id)
            .maybeSingle();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

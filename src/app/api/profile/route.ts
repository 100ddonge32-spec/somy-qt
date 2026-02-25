import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

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

        // 1. 휴대폰 중복 체크 및 통합 로직 (선택사항)
        if (profileData.phone) {
            const cleanInputPhone = profileData.phone.replace(/[^0-9]/g, '');
            const formattedInputPhone = cleanInputPhone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');

            // 관리자가 등록한 동일한 전번의 로우가 있는지 확인
            const { data: duplicate } = await supabaseAdmin
                .from('profiles')
                .select('*')
                .or(`phone.eq.${cleanInputPhone},phone.eq.${formattedInputPhone}`)
                .is('id', null)
                .maybeSingle();

            if (duplicate) {
                console.log(`[Profile Update] Duplicate found, merging: ${duplicate.email}`);
                // 현재 내 로우 삭제 (있다면)
                await supabaseAdmin.from('profiles').delete().eq('id', user_id).neq('email', duplicate.email);

                // 관리자 로우를 내 ID로 업데이트
                const { error: mergeError } = await supabaseAdmin
                    .from('profiles')
                    .update({ ...profileData, id: user_id })
                    .eq('email', duplicate.email);

                if (mergeError) throw mergeError;
                return NextResponse.json({ success: true, merged: true });
            }
        }

        // 2. 일반 업데이트
        const { error } = await supabaseAdmin
            .from('profiles')
            .update(profileData)
            .eq('id', user_id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[Profile Update Error]', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

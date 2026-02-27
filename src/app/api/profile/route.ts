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
                if (safeMergedData.birthdate === "") {
                    safeMergedData.birthdate = null;
                }

                const { error: mergeError } = await supabaseAdmin
                    .from('profiles')
                    .update(safeMergedData)
                    .eq('email', duplicate.email);

                if (mergeError) throw mergeError;
                return NextResponse.json({ success: true, merged: true });
            }
        }

        // 2. 일반 업데이트 (데이터 정제: DB에 없는 컬럼 제외)
        const safeData = { ...profileData };
        if ('is_birthdate_lunar' in safeData) {
            delete (safeData as any).is_birthdate_lunar;
        }

        // 빈 문자열로 날짜가 들어오면 null로 치환 (DB 에러 방지)
        if (safeData.birthdate === "") {
            safeData.birthdate = null;
        }

        const { error } = await supabaseAdmin
            .from('profiles')
            .update(safeData)
            .eq('id', user_id);

        if (error) throw error;

        return NextResponse.json({ success: true });
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

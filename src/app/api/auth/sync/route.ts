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
        return NextResponse.json({ error: 'Missing Supabase keys on server' }, { status: 500 });
    }

    try {
        const { user_id, email, name, avatar_url, phone: rawPhone } = await req.json();

        if (!user_id) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });

        console.log(`[Sync] 프로필 확인/생성 시작: ${user_id} (${email})`);

        // 0. 관리자인지 먼저 확인 (관리자라면 자동 승인 대상)
        let isAdminMember = false;
        if (email) {
            const { data: adminCheck } = await supabaseAdmin
                .from('app_admins')
                .select('*')
                .eq('email', email.toLowerCase().trim())
                .single();
            if (adminCheck) isAdminMember = true;
        }

        // 1. 기존 프로필 확인 (ID 기준)
        const { data: profileById } = await supabaseAdmin.from('profiles').select('*').eq('id', user_id).maybeSingle();

        // 2. 통합 대상 스캔 (연결되지 않은 관리자 등록 데이터)
        let match = null;

        // 2-1. 이메일 매칭
        if (email) {
            const { data: emailMatch } = await supabaseAdmin.from('profiles').select('*').eq('email', email).is('id', null).maybeSingle();
            if (emailMatch) match = emailMatch;
        }

        // 2-2. 휴대폰 매칭
        const inputPhone = rawPhone || (profileById?.phone);
        if (!match && inputPhone) {
            const cleanPhone = inputPhone.replace(/[^0-9]/g, '');
            const formattedPhone = cleanPhone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');

            const { data: phoneMatch } = await supabaseAdmin
                .from('profiles')
                .select('*')
                .or(`phone.eq.${cleanPhone},phone.eq.${formattedPhone}`)
                .is('id', null)
                .maybeSingle();
            if (phoneMatch) match = phoneMatch;
        }

        // 2-3. 이름 매칭 (공백 제거 후 비교)
        if (!match && name) {
            const cleanName = name.replace(/\s+/g, '');
            const { data: nameMatch } = await supabaseAdmin.from('profiles').select('*').eq('full_name', cleanName).is('id', null).maybeSingle();
            if (nameMatch) {
                match = nameMatch;
            } else {
                // 퍼지 매칭 시도
                const fuzzyName = `%${cleanName.split('').join('%')}%`;
                const { data: fuzzyMatch } = await supabaseAdmin.from('profiles').select('*').ilike('full_name', fuzzyName).is('id', null).limit(1).maybeSingle();
                if (fuzzyMatch) match = fuzzyMatch;
            }
        }

        // 3. 통합 또는 생성
        if (match) {
            if (profileById) {
                // 이미 ID로 프로필이 있는데 관리자 데이터와 매칭됨 -> 내용 병합 후 관리자 로우 삭제
                const updateFields = {
                    full_name: profileById.full_name || match.full_name,
                    phone: profileById.phone || match.phone,
                    birthdate: profileById.birthdate || match.birthdate,
                    address: profileById.address || match.address,
                    church_rank: profileById.church_rank || match.church_rank,
                    member_no: profileById.member_no || match.member_no,
                    gender: profileById.gender || match.gender,
                    avatar_url: profileById.avatar_url || match.avatar_url,
                    created_at: profileById.created_at || match.created_at,
                    is_approved: true
                };
                await supabaseAdmin.from('profiles').update(updateFields).eq('id', user_id);
                // 중복 로우 삭제 (이메일이 다를 수 있으므로 match.id(null인 로우의 PK) 등으로 식별하는게 좋지만, 현재 profiles는 id가 pk)
                // match 로우는 id가 null인 상태로 upsert되었을 수 있으나, 보통 PK가 있을 것임.
                // admin 업로드 로우는 id가 보통 생성되지 않거나 다른 방식일 텐데, 
                // match.email 등으로 삭제하거나, 실제 match.id가 있으면 그것으로 삭제.
                if (match.id && match.id !== user_id) {
                    await supabaseAdmin.from('profiles').delete().eq('id', match.id);
                } else if (match.email && match.email !== email) {
                    await supabaseAdmin.from('profiles').delete().eq('email', match.email).is('id', null);
                }

                return NextResponse.json({ status: 'merged', is_approved: true });
            } else {
                // 프로필 로우가 아예 없음 -> 관리자 데이터에 ID 부여
                await supabaseAdmin.from('profiles').update({
                    id: user_id,
                    email: email || match.email,
                    is_approved: true
                }).eq('email', match.email).is('id', null);

                return NextResponse.json({ status: 'linked', is_approved: true });
            }
        }

        if (!profileById) {
            // 매칭된 것도 없고 프로필도 없으면 신규 생성
            await supabaseAdmin.from('profiles').insert({
                id: user_id,
                email: email,
                full_name: name || '성도',
                avatar_url: avatar_url || null,
                church_id: 'jesus-in',
                is_approved: isAdminMember
            });
            return NextResponse.json({ status: 'created', is_approved: isAdminMember });
        }

        // 관리자 자동 승인 체크
        if (isAdminMember && !profileById.is_approved) {
            await supabaseAdmin.from('profiles').update({ is_approved: true }).eq('id', user_id);
            return NextResponse.json({ status: 'updated_to_approved', is_approved: true });
        }

        return NextResponse.json({ status: 'exists', is_approved: profileById.is_approved });

    } catch (err: any) {
        console.error('[Sync] 에러:', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

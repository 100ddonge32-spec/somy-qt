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

    if (!url || !key) return NextResponse.json({ error: 'Missing Supabase keys' }, { status: 500 });

    try {
        const { user_id, email, name: rawName, avatar_url, phone: rawPhone } = await req.json();
        if (!user_id) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });

        console.log(`[Sync] TargetID: ${user_id}, Name: ${rawName}, Phone: ${rawPhone}`);

        let isAdminMember = false;
        if (email) {
            const { data: adminCheck } = await supabaseAdmin.from('app_admins').select('*').eq('email', email.toLowerCase().trim()).single();
            if (adminCheck) isAdminMember = true;
        }

        // 현재 로그인한 유저의 프로필
        const { data: profileById } = await supabaseAdmin.from('profiles').select('*').eq('id', user_id).maybeSingle();

        let match = null;

        // 1. 이메일 매칭 (가장 정확 - 실제 이메일이 일치하는 경우)
        if (email) {
            // 나 자신이 아닌 다른 행 중에서 이메일이 같은 행 찾기
            const { data } = await supabaseAdmin.from('profiles')
                .select('*')
                .eq('email', email)
                .neq('id', user_id)
                .maybeSingle();
            if (data) match = data;
        }

        // 2. 가상 이메일/휴대폰 매칭 (어드민 업로드 데이터 찾기)
        const inputPhone = rawPhone || (profileById?.phone);
        if (!match && inputPhone) {
            const cleanPhone = inputPhone.replace(/[^0-9]/g, '');
            const fakeEmail = `${cleanPhone}@church.local`;

            // 가상 이메일로 매칭 시도
            const { data: emailMatch } = await supabaseAdmin.from('profiles')
                .select('*')
                .eq('email', fakeEmail)
                .neq('id', user_id)
                .maybeSingle();

            if (emailMatch) {
                match = emailMatch;
            } else {
                // 전화번호 텍스트로도 매칭 시도
                const formattedPhone = cleanPhone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
                const { data: phoneMatch } = await supabaseAdmin.from('profiles')
                    .select('*')
                    .or(`phone.eq.${cleanPhone},phone.eq.${formattedPhone}`)
                    .neq('id', user_id)
                    .maybeSingle();
                if (phoneMatch) match = phoneMatch;
            }
        }

        // 3. 이름 매칭 (마지막 수단)
        if (!match && rawName) {
            const cleanName = rawName.replace(/\s+/g, '');
            const { data: nameMatches } = await supabaseAdmin.from('profiles')
                .select('*')
                .ilike('full_name', `%${cleanName}%`)
                .neq('id', user_id);

            if (nameMatches && nameMatches.length > 0) {
                // 어드민 데이터(가상 이메일 보유)를 우선적으로 찾음
                const adminRow = nameMatches.find(m => m.email?.includes('@church.local') || m.email?.includes('@noemail.local'));
                match = adminRow || nameMatches[0];
            }
        }

        if (match) {
            console.log(`[Sync] 매칭 성공: ${match.full_name} (${match.id})`);

            // 필드 병합 데이터 준비
            const updateFields = {
                full_name: (profileById?.full_name && profileById.full_name !== '성도') ? profileById.full_name : match.full_name,
                phone: profileById?.phone || match.phone,
                birthdate: profileById?.birthdate || match.birthdate,
                address: profileById?.address || match.address,
                church_rank: profileById?.church_rank || match.church_rank,
                member_no: profileById?.member_no || match.member_no,
                gender: profileById?.gender || match.gender,
                avatar_url: profileById?.avatar_url || match.avatar_url,
                created_at: profileById?.created_at || match.created_at, // 가급적 행 생성일 유지
                is_approved: true
            };

            if (profileById) {
                // 1) 현재 유저 행 업데이트
                await supabaseAdmin.from('profiles').update(updateFields).eq('id', user_id);
                // 2) 매칭된 구(Admin) 행 삭제
                await supabaseAdmin.from('profiles').delete().eq('id', match.id);
                return NextResponse.json({ status: 'merged', name: updateFields.full_name });
            } else {
                // 3) 아예 행이 없었으면 match 행에 user_id 부여 (가장 깔끔)
                const linkData: any = { ...updateFields, id: user_id, email: email || match.email };
                await supabaseAdmin.from('profiles').update(linkData).eq('id', match.id);
                return NextResponse.json({ status: 'linked', name: linkData.full_name });
            }
        }

        // 매칭 실패 시 기본 동작
        if (!profileById) {
            await supabaseAdmin.from('profiles').insert({
                id: user_id,
                email: email || `${user_id}@noemail.local`,
                full_name: rawName || '성도',
                church_id: 'jesus-in',
                is_approved: isAdminMember
            });
            return NextResponse.json({ status: 'created' });
        }

        return NextResponse.json({ status: 'exists', is_approved: profileById.is_approved });

    } catch (err: any) {
        console.error('[Sync Error]', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

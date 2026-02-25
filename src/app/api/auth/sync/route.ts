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
        const { user_id, email, name, avatar_url } = await req.json();

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

        // 2-2. 이름 매칭 (공백 제거 후 비교)
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
                    avatar_url: profileById.avatar_url || match.avatar_url,
                    is_approved: true
                };
                await supabaseAdmin.from('profiles').update(updateFields).eq('id', user_id);
                await supabaseAdmin.from('profiles').delete().eq('email', match.email).is('id', null);
                return NextResponse.json({ status: 'merged', is_approved: true });
            } else {
                // 프로필 로우가 아예 없음 -> 관리자 데이터에 ID 부여
                await supabaseAdmin.from('profiles').update({ id: user_id, email: email || match.email, is_approved: true }).eq('email', match.email);
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

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
            const cleanInputPhone = inputPhone.replace(/[^0-9]/g, '');
            const fakeEmail = `${cleanInputPhone}@church.local`;

            // 가상 이메일로 매칭 시도
            const { data: emailMatch } = await supabaseAdmin.from('profiles')
                .select('*')
                .eq('email', fakeEmail)
                .neq('id', user_id)
                .maybeSingle();

            if (emailMatch) {
                match = emailMatch;
            } else {
                // 전화번호가 유사한 모든 후보를 가져와서 메모리에서 정밀 비교
                const { data: phoneCandidates } = await supabaseAdmin.from('profiles')
                    .select('*')
                    .not('phone', 'is', null)
                    .neq('id', user_id);

                if (phoneCandidates) {
                    const phoneMatch = phoneCandidates.find(p => {
                        const cleanP = (p.phone || '').replace(/[^0-9]/g, '');
                        return cleanP.length >= 8 && cleanP === cleanInputPhone;
                    });
                    if (phoneMatch) match = phoneMatch;
                }
            }
        }

        // 3. 이름 매칭 (마지막 수단 - 2글자 미만이거나 도트(.)는 제외)
        const nameForMatch = (rawName || '').trim();
        if (!match && nameForMatch && nameForMatch.length >= 2 && nameForMatch !== '.') {
            const cleanInputName = nameForMatch.replace(/\s+/g, '').toLowerCase();

            // 이름이 포함된 후보들을 가져와서 정밀 비교
            const { data: nameCandidates } = await supabaseAdmin.from('profiles')
                .select('*')
                .not('full_name', 'is', null)
                .neq('id', user_id);

            if (nameCandidates && nameCandidates.length > 0) {
                const matches = nameCandidates.filter(c => {
                    const cleanDbName = (c.full_name || '').replace(/\s+/g, '').toLowerCase();
                    return cleanDbName === cleanInputName;
                });

                if (matches.length > 0) {
                    // 어드민 데이터(가상 이메일 보유)를 우선적으로 찾음
                    const adminRow = matches.find(m => m.email?.includes('@church.local') || m.email?.includes('@noemail.local'));
                    // 만약 정확히 일치하는 이름이 있다면 그것을 우선
                    const exactMatch = matches.find(m => m.full_name?.trim() === nameForMatch);
                    match = exactMatch || adminRow || matches[0];
                }
            }
        }

        // 이름 비정상 확인 (점 하나만 있는 경우 등)
        const finalName = (nameForMatch && nameForMatch !== '.') ? nameForMatch : '성도';

        if (match) {
            console.log(`[Sync] 매칭 성공: ${match.full_name} (${match.id})`);

            // 필드 병합 데이터 준비 (어드민 업로드 데이터 match가 기준이 됨)
            const updateFields: any = {
                // 이름: match(어드민 데이터)의 이름을 우선하되, match에 없으면 현재(profileById) 또는 요청(rawName) 순
                full_name: match.full_name || rawName || profileById?.full_name || '성도',
                // 전화번호: match 또는 요청된 번호 우선
                phone: match.phone || rawPhone || profileById?.phone,
                birthdate: match.birthdate || profileById?.birthdate,
                address: match.address || profileById?.address,
                church_rank: match.church_rank || profileById?.church_rank,
                member_no: match.member_no || profileById?.member_no,
                gender: match.gender || profileById?.gender,
                avatar_url: profileById?.avatar_url || match.avatar_url,
                church_id: match.church_id || profileById?.church_id || 'jesus-in',
                is_approved: true // 매칭되었으므로 승인 처리
            };

            if (profileById) {
                // 1) 현재 유저 행 업데이트
                await supabaseAdmin.from('profiles').update(updateFields).eq('id', user_id);
                // 2) 매칭된 구(Admin) 행 삭제
                await supabaseAdmin.from('profiles').delete().eq('id', match.id);
                return NextResponse.json({ status: 'merged', name: updateFields.full_name, is_approved: true, church_id: updateFields.church_id });
            } else {
                // 3) 아예 행이 없었으면 match 행에 user_id 부여 (가장 깔끔)
                const linkData: any = { ...updateFields, id: user_id, email: email || match.email };
                await supabaseAdmin.from('profiles').update(linkData).eq('id', match.id);
                return NextResponse.json({ status: 'linked', name: linkData.full_name, is_approved: true, church_id: updateFields.church_id });
            }
        }

        // 매칭 실패 시 기본 동작
        if (!profileById) {
            await supabaseAdmin.from('profiles').insert({
                id: user_id,
                email: email || `${user_id}@noemail.local`,
                full_name: finalName,
                phone: rawPhone || null,
                church_id: 'jesus-in',
                is_approved: isAdminMember
            });
            return NextResponse.json({ status: 'created', name: finalName, is_approved: isAdminMember, church_id: 'jesus-in' });
        }

        // 이미 존재하는데 매칭 안 된 경우 (수동 인증 시도 중일 수 있음)
        if (rawName || rawPhone) {
            // 정보가 업데이트되었을 수 있으므로 프로필 행 업데이트 시도
            const patch: any = {};
            if (rawName) patch.full_name = rawName;
            if (rawPhone) patch.phone = rawPhone;
            if (Object.keys(patch).length > 0) {
                await supabaseAdmin.from('profiles').update(patch).eq('id', user_id);
            }
        }

        return NextResponse.json({ status: 'exists', is_approved: profileById.is_approved, church_id: profileById.church_id || 'jesus-in' });

    } catch (err: any) {
        console.error('[Sync Error]', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

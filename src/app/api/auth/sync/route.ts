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
        const { user_id, email, name: rawName, avatar_url, phone: rawPhone, birthdate: rawBirth } = await req.json();
        if (!user_id) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });

        console.log(`[Sync] TargetID: ${user_id}, Name: ${rawName}, Phone: ${rawPhone}, Birth: ${rawBirth}`);

        let isAdminMember = false;
        if (email) {
            const { data: adminCheck } = await supabaseAdmin.from('app_admins').select('*').eq('email', email.toLowerCase().trim()).single();
            if (adminCheck) isAdminMember = true;
        }

        // [추가] 이메일이 없더라도 이름이 '백동희'라면 슈퍼관리자로 인식하여 자동 승인 기초값 세팅
        const IS_BOSS = rawName?.trim() === '백동희' || rawName?.trim() === '동희';
        if (!isAdminMember && IS_BOSS) {
            isAdminMember = true;
            console.log(`[Sync] Boss detected by name: ${rawName}. Auto-approving.`);
        }

        // 현재 로그인한 유저의 프로필
        const { data: profileById } = await supabaseAdmin.from('profiles').select('*').eq('id', user_id).maybeSingle();

        // 이미 승인된 경우 중복 처리 방지
        if (profileById?.is_approved) {
            return NextResponse.json({ status: 'already_approved', name: profileById.full_name });
        }

        let match = null;

        // 1. 이메일 매칭
        if (email) {
            const { data } = await supabaseAdmin.from('profiles')
                .select('*')
                .eq('email', email)
                .neq('id', user_id)
                .maybeSingle();
            if (data) match = data;
        }

        // 2. 가상 이메일/휴대폰 매칭
        const inputPhone = rawPhone || (profileById?.phone);
        if (!match && inputPhone) {
            const cleanInputPhone = inputPhone.replace(/[^0-9]/g, '');
            const fakeEmail = `${cleanInputPhone}@church.local`;

            const { data: emailMatch } = await supabaseAdmin.from('profiles')
                .select('*')
                .eq('email', fakeEmail)
                .neq('id', user_id)
                .maybeSingle();

            if (emailMatch) {
                match = emailMatch;
            } else {
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

        // 이름 보완
        let nameForMatch = (rawName || '').trim();
        if (!nameForMatch || nameForMatch === '.') {
            try {
                const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(user_id);
                nameForMatch = (authUser?.user_metadata?.full_name || authUser?.user_metadata?.name || '').trim();
            } catch (authErr) {
                console.error('[Sync] Auth fetch failed:', authErr);
            }
        }

        // 3. 이름 + 생년월일 정밀 매칭 (Birthdate 추가)
        if (!match && nameForMatch && nameForMatch.length >= 2 && nameForMatch !== '.') {
            const cleanInputName = nameForMatch.replace(/\s+/g, '').toLowerCase();

            const { data: nameCandidates } = await supabaseAdmin.from('profiles')
                .select('*')
                .not('full_name', 'is', null)
                .neq('id', user_id);

            if (nameCandidates && nameCandidates.length > 0) {
                const matches = nameCandidates.filter(c => {
                    const cleanDbName = (c.full_name || '').replace(/\s+/g, '').toLowerCase();
                    const nameMatch = cleanDbName === cleanInputName;

                    // 생년월일까지 넘어왔다면 그것까지 확인
                    if (nameMatch && rawBirth) {
                        const dbBirth = (c.birthdate || '').replace(/[^0-9]/g, '');
                        const inBirth = rawBirth.replace(/[^0-9]/g, '');
                        if (dbBirth && inBirth) {
                            return dbBirth.endsWith(inBirth) || inBirth.endsWith(dbBirth);
                        }
                    }
                    return nameMatch;
                });

                if (matches.length > 0) {
                    const adminRow = matches.find(m => m.email?.includes('@church.local') || m.email?.includes('@noemail.local'));
                    const exactMatch = matches.find(m => m.full_name?.trim() === nameForMatch);
                    match = exactMatch || adminRow || matches[0];
                }
            }
        }

        const isSystemGeneratedName = nameForMatch.startsWith('kakao_') || nameForMatch.startsWith('user_');
        const finalName = (nameForMatch && nameForMatch !== '.' && !isSystemGeneratedName) ? nameForMatch : (email ? email.split('@')[0] : '성도');

        if (match) {
            console.log(`[Sync] 매칭 성공: ${match.full_name} (${match.id})`);
            const updateFields: any = {
                full_name: match.full_name || rawName || profileById?.full_name || '성도',
                phone: match.phone || rawPhone || profileById?.phone,
                birthdate: match.birthdate || rawBirth || profileById?.birthdate,
                address: match.address || profileById?.address,
                church_rank: match.church_rank || profileById?.church_rank,
                member_no: match.member_no || profileById?.member_no,
                gender: match.gender || profileById?.gender,
                avatar_url: profileById?.avatar_url || match.avatar_url,
                church_id: match.church_id || profileById?.church_id || 'jesus-in',
                is_approved: IS_BOSS || match.is_approved // 보스이거나 기존 매칭 데이터가 승인된 상태면 승인
            };

            if (profileById) {
                await supabaseAdmin.from('profiles').update(updateFields).eq('id', user_id);
                await supabaseAdmin.from('profiles').delete().eq('id', match.id);
                return NextResponse.json({ status: 'merged', name: updateFields.full_name, is_approved: updateFields.is_approved, church_id: updateFields.church_id });
            } else {
                const linkData: any = { ...updateFields, id: user_id, email: email || match.email };
                await supabaseAdmin.from('profiles').update(linkData).eq('id', match.id);
                return NextResponse.json({ status: 'linked', name: linkData.full_name, is_approved: updateFields.is_approved, church_id: updateFields.church_id });
            }
        }

        // 매칭 실패 시 -> 신규 생성 또는 기존 정보 업데이트
        const dataToSet = {
            id: user_id,
            email: email || profileById?.email || `${user_id}@noemail.local`,
            full_name: rawName || profileById?.full_name || finalName,
            phone: rawPhone || profileById?.phone,
            birthdate: rawBirth || profileById?.birthdate,
            church_id: 'jesus-in',
            is_approved: isAdminMember // BOSS일 경우 true
        };

        if (profileById) {
            // "이미 존재함" 에러 대신 정보를 업데이트하고 상태를 반환함
            await supabaseAdmin.from('profiles').update(dataToSet).eq('id', user_id);
            return NextResponse.json({ status: 'updated', name: dataToSet.full_name, is_approved: dataToSet.is_approved, church_id: 'jesus-in' });
        } else {
            await supabaseAdmin.from('profiles').insert(dataToSet);
            return NextResponse.json({ status: 'created', name: dataToSet.full_name, is_approved: dataToSet.is_approved, church_id: 'jesus-in' });
        }

    } catch (err: any) {
        console.error('[Sync Error]', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

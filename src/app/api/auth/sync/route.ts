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
        const { user_id, email, name: rawName, avatar_url: rawAvatar, phone: rawPhone, birthdate: rawBirth } = await req.json();
        if (!user_id) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });

        console.log(`[Sync] TargetID: ${user_id}, Email: ${email}, Name: ${rawName}, Phone: ${rawPhone}, Birth: ${rawBirth}`);

        let isAdminMember = false;
        if (email) {
            const { data: adminCheck } = await supabaseAdmin.from('app_admins').select('*').eq('email', email.toLowerCase().trim()).single();
            if (adminCheck) isAdminMember = true;
        }

        const IS_BOSS = rawName?.trim() === '백동희' || rawName?.trim() === '동희';
        if (!isAdminMember && IS_BOSS) {
            isAdminMember = true;
            console.log(`[Sync] Boss detected by name: ${rawName}. Auto-approving.`);
        }

        const { data: profileById } = await supabaseAdmin.from('profiles').select('*').eq('id', user_id).maybeSingle();

        let match = null;

        // 1. 이메일 매칭
        if (email && !email.includes('anonymous.local') && !email.includes('noemail.local')) {
            const { data } = await supabaseAdmin.from('profiles')
                .select('*')
                .eq('email', email)
                .neq('id', user_id)
                .maybeSingle();
            if (data) match = data;
        }

        // 2. 휴대폰 매칭
        const inputPhone = rawPhone || profileById?.phone;
        if (!match && inputPhone) {
            let cleanInputPhone = inputPhone.replace(/[^0-9]/g, '');
            // +82 10... -> 010... 변환
            if (cleanInputPhone.startsWith('8210')) {
                cleanInputPhone = '0' + cleanInputPhone.substring(2);
            } else if (cleanInputPhone.startsWith('10') && cleanInputPhone.length === 10) {
                cleanInputPhone = '0' + cleanInputPhone;
            }

            if (cleanInputPhone.length >= 8) {
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
                        .select('id, phone, full_name, email, is_approved, church_id')
                        .not('phone', 'is', null)
                        .neq('id', user_id);

                    if (phoneCandidates) {
                        const pm = phoneCandidates.find(p => {
                            let cleanP = (p.phone || '').replace(/[^0-9]/g, '');
                            if (cleanP.startsWith('8210')) cleanP = '0' + cleanP.substring(2);
                            return cleanP.length >= 8 && cleanP === cleanInputPhone;
                        });
                        if (pm) match = pm;
                    }
                }
            }
        }

        // 3. 이름 + 추가 정보 매칭
        let nameForMatch = (rawName || '').trim();
        const genericNames = ['성도', '이름 없음', '이름미입력', '사용자', '큐티', 'somy'];
        const isSystemGeneratedName = nameForMatch.startsWith('kakao_') ||
            nameForMatch.startsWith('user_') ||
            genericNames.includes(nameForMatch) ||
            nameForMatch.length < 2;

        if (!match && nameForMatch && !isSystemGeneratedName) {
            const cleanInputName = nameForMatch.replace(/\s+/g, '').toLowerCase();
            const { data: nameCandidates } = await supabaseAdmin.from('profiles')
                .select('id, full_name, birthdate, email, phone, is_approved, church_id')
                .not('full_name', 'is', null)
                .neq('id', user_id);

            if (nameCandidates && nameCandidates.length > 0) {
                const matches = nameCandidates.filter(c => {
                    const cleanDbName = (c.full_name || '').replace(/\s+/g, '').toLowerCase();
                    const nameMatch = cleanDbName === cleanInputName;
                    if (nameMatch) {
                        // 1) 생일이나 전화번호가 있으면 대조
                        let points = 0;
                        if (rawBirth && c.birthdate) {
                            const dbBirth = c.birthdate.replace(/[^0-9]/g, '');
                            const inBirth = rawBirth.replace(/[^0-9]/g, '');
                            if (dbBirth && inBirth && (dbBirth.endsWith(inBirth) || inBirth.endsWith(dbBirth))) points++;
                        }
                        if (inputPhone && c.phone) {
                            let cleanDbPhone = c.phone.replace(/[^0-9]/g, '');
                            if (cleanDbPhone.startsWith('8210')) cleanDbPhone = '0' + cleanDbPhone.substring(2);
                            let cleanInPhone = inputPhone.replace(/[^0-9]/g, '');
                            if (cleanInPhone.startsWith('8210')) cleanInPhone = '0' + cleanInPhone.substring(2);
                            if (cleanDbPhone && cleanInPhone && cleanDbPhone === cleanInPhone) points++;
                        }

                        // 포인트가 있거나 (정보 일치), 
                        if (points > 0) return true;

                        // 2) 정보가 아예 없거나 가계정(@church.local) 이라면 이름만으로 일단 매칭 시도 (동일 이름이 여러 명이면 패스)
                        const isFakeOrNoEmail = !c.email || c.email.includes('@church.local') || c.email.includes('@noemail.local');
                        if (!rawBirth && !inputPhone && isFakeOrNoEmail) {
                            const sameNameCount = nameCandidates.filter(nc => (nc.full_name || '').replace(/\s+/g, '').toLowerCase() === cleanInputName).length;
                            return sameNameCount === 1; // 이름이 유일할 때만 매칭
                        }

                        return false;
                    }
                    return false;
                });

                if (matches.length > 0) {
                    match = matches.find(m => m.email?.includes('@church.local') || !m.email) || matches[0];
                }
            }
        }

        if (match) {
            console.log(`[Sync] 학습 성공: ${match.full_name} (${match.id}) -> ${user_id}`);
            const finalAvatar = profileById?.avatar_url || match.avatar_url || rawAvatar;

            // [핵심 수정] 관리자 DB에 등록된 성도와 이름+전화번호가 일치하면 무조건 즉시 승인!
            // match.is_approved가 null/false인 경우도 매칭 성공이면 학습된 성도이므로 true
            const updateFields: any = {
                full_name: match.full_name || profileById?.full_name || rawName || '성도',
                phone: match.phone || profileById?.phone || rawPhone,
                birthdate: match.birthdate || profileById?.birthdate || rawBirth,
                address: match.address || profileById?.address,
                church_rank: match.church_rank || profileById?.church_rank,
                member_no: match.member_no || profileById?.member_no,
                gender: match.gender || profileById?.gender,
                avatar_url: finalAvatar,
                church_id: match.church_id || profileById?.church_id || 'jesus-in',
                is_approved: true // ← 매칭 성공 시 항상 true (관리자가 등록한 성도 = 승인된 성도)
            };

            if (profileById) {
                await supabaseAdmin.from('profiles').update(updateFields).eq('id', user_id);
                if (match.id !== user_id) {
                    await supabaseAdmin.from('profiles').delete().eq('id', match.id);
                }
                // name 필드도 함께 반환 (result.name 호환성 유지)
                return NextResponse.json({ ...updateFields, name: updateFields.full_name, status: 'merged' });
            } else {
                const newProfile = { ...updateFields, id: user_id, email: email || match.email };
                await supabaseAdmin.from('profiles').insert([newProfile]);
                if (match.id !== user_id) {
                    await supabaseAdmin.from('profiles').delete().eq('id', match.id);
                }
                return NextResponse.json({ ...newProfile, name: newProfile.full_name, status: 'linked' });
            }
        }

        const finalName = (nameForMatch && !isSystemGeneratedName) ? nameForMatch : (email ? email.split('@')[0] : '성도');
        const currentName = profileById?.full_name;
        const isCurrentNameGeneric = !currentName || genericNames.includes(currentName) || currentName === '.';
        const isNewNameBetter = finalName && !genericNames.includes(finalName) && finalName !== '.';

        const dataToSet = {
            id: user_id,
            email: email || profileById?.email || `${user_id}@noemail.local`,
            full_name: (isCurrentNameGeneric && isNewNameBetter) ? finalName : (currentName || finalName),
            phone: profileById?.phone || rawPhone,
            birthdate: profileById?.birthdate || rawBirth,
            avatar_url: profileById?.avatar_url || rawAvatar,
            church_id: profileById?.church_id || 'jesus-in',
            is_approved: profileById?.is_approved || isAdminMember || IS_BOSS  // [변경] 명시적 권한 있을 때만 승인
        };

        if (profileById) {
            await supabaseAdmin.from('profiles').update(dataToSet).eq('id', user_id);
            return NextResponse.json({ ...dataToSet, status: 'updated' });
        } else {
            const isAnonymous = !email ||
                email.includes('anonymous.local') ||
                email.includes('noemail.local') ||
                email.includes('kakao.somy-qt.local');
            const hasRealInfo = (rawName && !isSystemGeneratedName && !genericNames.includes(rawName)) || (rawPhone && rawPhone.length > 5);
            if (isAnonymous && !hasRealInfo) {
                console.log(`[Sync] Skipping profile creation for generic/anonymous user: ${email}`);
                return NextResponse.json({ status: 'visitor', is_approved: false, church_id: 'jesus-in' });
            }
            await supabaseAdmin.from('profiles').insert([dataToSet]);
            return NextResponse.json({ ...dataToSet, status: 'created' });
        }

    } catch (err: any) {
        console.error('[Sync Error]', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

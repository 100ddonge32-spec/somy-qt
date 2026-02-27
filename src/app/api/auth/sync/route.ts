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
            const cleanInputPhone = inputPhone.replace(/[^0-9]/g, '');
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
                            const cleanP = (p.phone || '').replace(/[^0-9]/g, '');
                            return cleanP.length >= 8 && cleanP === cleanInputPhone;
                        });
                        if (pm) match = pm;
                    }
                }
            }
        }

        // 3. 이름 + 추가 정보 매칭
        let nameForMatch = (rawName || '').trim();
        const isSystemGeneratedName = nameForMatch.startsWith('kakao_') || nameForMatch.startsWith('user_');

        if (!match && nameForMatch && nameForMatch.length >= 2 && !isSystemGeneratedName) {
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
                        if (rawBirth) {
                            const dbBirth = (c.birthdate || '').replace(/[^0-9]/g, '');
                            const inBirth = rawBirth.replace(/[^0-9]/g, '');
                            if (dbBirth && inBirth && (dbBirth.endsWith(inBirth) || inBirth.endsWith(dbBirth))) return true;
                        }
                        if (inputPhone) {
                            const cleanDbPhone = (c.phone || '').replace(/[^0-9]/g, '');
                            const cleanInPhone = inputPhone.replace(/[^0-9]/g, '');
                            if (cleanDbPhone && cleanInPhone && cleanDbPhone === cleanInPhone) return true;
                        }
                        return false;
                    }
                    return false;
                });

                if (matches.length > 0) {
                    match = matches.find(m => m.email?.includes('@church.local') || m.email?.includes('@noemail.local')) || matches[0];
                }
            }
        }

        if (match) {
            console.log(`[Sync] Merging match: ${match.full_name} (${match.id}) -> ${user_id}`);
            const finalAvatar = profileById?.avatar_url || match.avatar_url || rawAvatar;
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
                is_approved: match.is_approved || profileById?.is_approved || IS_BOSS || false
            };

            if (profileById) {
                await supabaseAdmin.from('profiles').update(updateFields).eq('id', user_id);
                if (match.id !== user_id) {
                    await supabaseAdmin.from('profiles').delete().eq('id', match.id);
                }
                return NextResponse.json({ ...updateFields, status: 'merged' });
            } else {
                const newProfile = { ...updateFields, id: user_id, email: email || match.email };
                await supabaseAdmin.from('profiles').insert([newProfile]);
                await supabaseAdmin.from('profiles').delete().eq('id', match.id);
                return NextResponse.json({ ...newProfile, status: 'linked' });
            }
        }

        const finalName = (nameForMatch && !isSystemGeneratedName) ? nameForMatch : (email ? email.split('@')[0] : '성도');
        const dataToSet = {
            id: user_id,
            email: email || profileById?.email || `${user_id}@noemail.local`,
            full_name: profileById?.full_name || finalName,
            phone: profileById?.phone || rawPhone,
            birthdate: profileById?.birthdate || rawBirth,
            avatar_url: profileById?.avatar_url || rawAvatar,
            church_id: profileById?.church_id || 'jesus-in',
            is_approved: profileById?.is_approved || isAdminMember || false
        };

        if (profileById) {
            await supabaseAdmin.from('profiles').update(dataToSet).eq('id', user_id);
            return NextResponse.json({ ...dataToSet, status: 'updated' });
        } else {
            const isAnonymous = !email || email.includes('anonymous.local') || email.includes('noemail.local');
            const hasRealInfo = (rawName && !isSystemGeneratedName) || (rawPhone && rawPhone.length > 5);
            if (isAnonymous && !hasRealInfo) {
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

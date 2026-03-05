import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

webpush.setVapidDetails(
    'mailto:pastorbaek@kakao.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BCpTn0SHIYSZzjST5xxL1Cv9svmlp3f9Xmvt9FSALBvo4QwLQCBlo_mu4ThoMHgINRmAk4c9sxwVwI2QtDyHr1I',
    process.env.VAPID_PRIVATE_KEY || 'LAAS6aJenIKYBShIGZsWVKhXNOMKwkuXvpf2NLCGZAI'
);

const normalizeId = (id: string | null) => {
    if (!id) return 'jesus-in'; // 빈 값은 기본적으로 메인(예수인교회) 소속으로 간주
    const s = id.toLowerCase().trim();
    if (s === '예수인교회' || s === 'jesus-in' || s === '예수인' || s === 'jesus' || s === 'default' || s === 'somy-main' || s === '') {
        return 'jesus-in';
    }
    return s;
};

// 관리자 권한 및 성도 목록 조회
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action'); // 'check_admin' | 'list_members' | 'get_church_stats' | 'list_all_admins'
    const churchId = searchParams.get('church_id');

    try {
        // [1] 관리자 권한 확인
        if (action === 'check_admin') {
            const userId = searchParams.get('user_id');
            let email = searchParams.get('email');

            // 슈퍼어드민 리스트 (본계정)
            const HARDCODED_ADMINS = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "pastorbaek@kakao.com,kakao_4761026797@kakao.somy-qt.local").toLowerCase().split(',').map(e => e.trim());

            // 익명 유저 이메일 및 실명(Master) 보완
            if (userId && (!email || email.includes('anonymous.local') || email === 'null' || email === 'undefined')) {
                const { data: profile } = await supabaseAdmin.from('profiles').select('email, full_name').eq('id', userId).maybeSingle();
                if (profile?.email && !profile.email.includes('anonymous.local')) email = profile.email;
                if (profile?.full_name === '백동희' || profile?.full_name === '동희') {
                    console.log(`[Admin Check] Master detected by name: ${profile.full_name}`);
                    return NextResponse.json({ email: profile.email || `${userId}@boss.somy`, role: 'super_admin', church_id: churchId || 'somy-main' });
                }
            }

            // [0순위] 실명/이메일 기반 전역 슈퍼관리자 여부 확인 (어떤 교회 소속이든 무관)
            if (email && email !== 'undefined' && email !== 'null') {
                const formattedEmail = email.toLowerCase().trim();
                if (HARDCODED_ADMINS.includes(formattedEmail)) {
                    // [핵심] 슈퍼어드민은 요청한 church_id가 있다면 그 context를 유지해줌
                    return NextResponse.json({ email: formattedEmail, role: 'super_admin', church_id: churchId || 'somy-main' });
                }
            }

            // 1순위: 특정 교회 소속 관리자 여부 (userId 또는 email)
            let query = supabaseAdmin.from('app_admins').select('*');
            if (churchId) query = query.eq('church_id', churchId);

            if (email && email !== 'undefined' && email !== 'null') {
                const formattedEmail = email.toLowerCase().trim();
                if (HARDCODED_ADMINS.includes(formattedEmail) && (churchId === 'somy-main' || !churchId)) {
                    return NextResponse.json({ email: formattedEmail, role: 'super_admin', church_id: churchId || 'somy-main' });
                }
                query = query.eq('email', formattedEmail);
            } else if (userId) {
                query = query.eq('user_id', userId);
            } else {
                return NextResponse.json({ role: 'user' });
            }

            const { data } = await query.maybeSingle();
            if (data) return NextResponse.json(data);

            // 2순위: 전역 관리자 여부 (이메일 및 user_id)
            let globalQuery = supabaseAdmin.from('app_admins').select('*');
            if (email && email !== 'undefined' && email !== 'null') {
                const formattedEmail = email.toLowerCase().trim();
                if (HARDCODED_ADMINS.includes(formattedEmail)) {
                    return NextResponse.json({ email: formattedEmail, role: 'super_admin', church_id: churchId || 'somy-main' });
                }
                globalQuery = globalQuery.eq('email', formattedEmail);
            } else if (userId) {
                globalQuery = globalQuery.eq('user_id', userId);
            }

            const { data: globalAdmin } = await globalQuery.maybeSingle();
            if (globalAdmin) {
                // [신규 보안 강화] 전역 관리자가 아닌 지역(church) 관리자라면 본인 교회일 때만 권한 부여
                if (globalAdmin.role === 'super_admin') return NextResponse.json(globalAdmin);
                if (globalAdmin.church_id === churchId) return NextResponse.json(globalAdmin);
            }

            return NextResponse.json({ role: 'user' });
        }

        // [2] 성도 목록 조회
        if (action === 'list_members') {
            if (!churchId) return NextResponse.json({ error: 'Church ID required' }, { status: 400 });

            // [신규] 플랫폼 메인(somy-main)은 관리할 실질적인 '소속 성도' 개념이 없으므로 항상 0명 반환 (오염된 데이터 초기화)
            if (churchId === 'somy-main') {
                return NextResponse.json([]);
            }

            let { data, error } = await supabaseAdmin.from('profiles').select('*').eq('church_id', churchId).order('created_at', { ascending: false });
            if (error) throw error;

            if (data) {
                data = data.filter(m => {
                    const isGhost = (m.full_name === '성도' || m.full_name === '이름 없음') && !m.phone;
                    return !isGhost || m.is_approved;
                });
            }
            return NextResponse.json(data);
        }

        // [3] 교회별 통계 (등록된 교회 기준)
        if (action === 'get_church_stats') {
            console.log(`[Admin API] action=get_church_stats triggered by ${searchParams.get('requester_id') || 'unknown'}`);
            // 1. 등록된 교회 목록 가져오기 (church_settings 기준)
            const { data: churches, error: chErr } = await supabaseAdmin.from('church_settings')
                .select('id, church_id, church_name, plan, created_at')
                .order('created_at', { ascending: false });
            if (chErr) {
                console.error("[Admin API] Failed to fetch churches:", chErr);
                throw chErr;
            }
            console.log(`[Admin API] Found ${churches?.length || 0} registered churches`);

            // 2. 전체 성도수 집계 (1000명 이상 대응을 위한 페이지네이션)
            const countMap: Record<string, number> = {};
            let batchPage = 0;
            const batchSize = 1000;
            let totalProcessed = 0;

            while (true) {
                const { data: profileBatch, error: pErr } = await supabaseAdmin.from('profiles')
                    .select('church_id')
                    .range(batchPage * batchSize, (batchPage + 1) * batchSize - 1);

                if (pErr) {
                    console.error(`[Admin API] Failed to fetch profiles batch ${batchPage}:`, pErr);
                    throw pErr;
                }
                if (!profileBatch || profileBatch.length === 0) break;

                totalProcessed += profileBatch.length;
                profileBatch.forEach(p => {
                    const cid = normalizeId(p.church_id) || 'jesus-in';
                    countMap[cid] = (countMap[cid] || 0) + 1;
                });

                if (profileBatch.length < batchSize) break;
                batchPage++;
            }
            console.log(`[Admin API] Total profiles processed: ${totalProcessed}`);
            console.log(`[Admin API] Count map sample:`, Object.entries(countMap).slice(0, 5));

            // 3. 결합 및 보정
            const stats = (churches || []).map(ch => {
                const normCid = normalizeId(ch.church_id) || 'jesus-in';
                const isMain = ch.id === 1 || normCid === 'jesus-in';
                const effectiveId = isMain ? 'jesus-in' : normCid;

                return {
                    id: ch.id,
                    church_id: effectiveId,
                    church_name: ch.id === 1 ? (ch.church_name || '예수인교회') : (ch.church_name || ch.church_id),
                    count: countMap[effectiveId] || 0,
                    plan: ch.plan,
                    created_at: ch.created_at
                };
            });

            // [추가] 등록은 안 되어 있는데 성도 데이터만 있는 아이디들도 'Trial/Orphan' 섹션을 위해 따로 반환
            const registeredIds = new Set(stats.map(s => s.church_id));
            const orphans: any[] = [];
            Object.entries(countMap).forEach(([cid, count]) => {
                if (!registeredIds.has(cid) && cid !== 'jesus-in') {
                    orphans.push({ church_id: cid, church_name: `미등록 데이터 (${cid})`, count, is_orphan: true });
                }
            });

            console.log(`[Admin API] Returning ${stats.length} registered stats and ${orphans.length} orphans`);
            return NextResponse.json({ registered: stats, orphans });
        }

        // [4] 전체 관리자 목록 (Master 전용)
        if (action === 'list_all_admins') {
            const { data: admins, error: adminErr } = await supabaseAdmin.from('app_admins').select('*').order('email', { ascending: true });
            if (adminErr) throw adminErr;
            if (!admins || admins.length === 0) return NextResponse.json([]);

            // Step 2: 등록된 이메일 또는 user_id로 profiles 별도 조회
            const identifiers: any[] = admins.flatMap((a: any) => [a.email, a.user_id, a.id]).filter(Boolean);
            const uniqueIdentifiers = Array.from(new Set(identifiers.map((i: any) => i.toString())))
                .filter((i: string) => i.length > 5);

            let profiles: any[] = [];
            if (uniqueIdentifiers.length > 0) {
                const uuids = uniqueIdentifiers.filter(i => /^[0-9a-f-]{36}$/i.test(i));
                const orConditions = [];
                orConditions.push(`email.in.(${uniqueIdentifiers.map(i => `"${i}"`).join(',')})`);
                if (uuids.length > 0) orConditions.push(`id.in.(${uuids.map(i => `"${i}"`).join(',')})`);

                const { data: profileData } = await supabaseAdmin.from('profiles').select('id, email, full_name, avatar_url').or(orConditions.join(','));
                profiles = profileData || [];
            }

            const profileMapByEmail: Record<string, any> = {};
            const profileMapById: Record<string, any> = {};
            profiles.forEach((p: any) => {
                if (p.email) profileMapByEmail[p.email.toLowerCase()] = p;
                if (p.id) profileMapById[p.id] = p;
            });

            const formattedData = admins.map((admin: any) => {
                const emailKey = admin.email?.toLowerCase();
                const profile = (emailKey && profileMapByEmail[emailKey])
                    || (admin.user_id && profileMapById[admin.user_id])
                    || (admin.email && profileMapById[admin.email])
                    || (admin.id && profileMapById[admin.id])
                    || null;

                return {
                    ...admin,
                    name: profile?.full_name || admin.full_name || admin.name || (admin.role === 'super_admin' ? '운영자(슈퍼)' : '신규 관리자'),
                    avatar_url: profile?.avatar_url || admin.avatar_url || null
                };
            });

            return NextResponse.json(formattedData);
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (err: any) {
        console.error('[Admin GET Error]', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// 조지 관리자 지정 및 성도 승인 처리
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { action, email, user_id, is_approved, church_id, role, requester_id, requester_email: body_requester_email } = body;

        // [0순위 보안] 권한 검증 (Gatekeeper Logic)
        const HARDCODED_ADMINS = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "pastorbaek@kakao.com,kakao_4761026797@kakao.somy-qt.local").toLowerCase().split(',').map(e => e.trim());

        if (!requester_id) {
            return NextResponse.json({ success: false, error: "권한이 없습니다. (No Requester ID)" }, { status: 401 });
        }

        // 1. 요청자 프로필 정보 로드
        const { data: requesterProfile } = await supabaseAdmin
            .from('profiles')
            .select('email, full_name')
            .eq('id', requester_id)
            .maybeSingle();

        let reqEmail = (requesterProfile?.email || body_requester_email || '').toLowerCase().trim();

        // [보정] 프로필에 이메일이 없는데 클라이언트가 보냈다면 즉시 업데이트 시도
        if (requester_id && !requesterProfile?.email && body_requester_email) {
            await supabaseAdmin.from('profiles').update({ email: body_requester_email }).eq('id', requester_id);
        }

        // 2. app_admins에서 권한 조회 (ID 또는 이메일로)
        const { data: qById } = await supabaseAdmin.from('app_admins').select('*').eq('user_id', requester_id);
        const { data: qByEmail } = reqEmail ? await supabaseAdmin.from('app_admins').select('*').eq('email', reqEmail) : { data: [] };

        const adminsForRequester = [...(qById || []), ...(qByEmail || [])];
        const uniqueAdmins = Array.from(new Map(adminsForRequester.map(a => [a.id, a])).values());

        const adminInfo = uniqueAdmins.find(a => a.role === 'super_admin') || uniqueAdmins[0];

        // [핵심 해결] ID 매칭이 안 되어 있다면 이메일 기반으로 찾아와서 user_id를 업데이트 (Self-Healing)
        if (qByEmail && qByEmail.length > 0 && (!qById || qById.length === 0)) {
            for (const adm of qByEmail) {
                if (!adm.user_id || adm.user_id !== requester_id) {
                    console.log(`[Admin-Fix] Auto-linking admin user_id for: ${adm.email}`);
                    await supabaseAdmin.from('app_admins').update({ user_id: requester_id }).eq('id', adm.id);
                }
            }
        }

        const isGlobalMaster = (reqEmail && HARDCODED_ADMINS.includes(reqEmail)) ||
            (adminInfo?.role === 'super_admin') ||
            (requesterProfile?.full_name === '백동희' || requesterProfile?.full_name === '동희');

        console.log(`[Admin Debug/API] Requester: ${requester_id}, Email: ${reqEmail}, Role: ${adminInfo?.role}, isMaster: ${isGlobalMaster}`);

        // 1. 마스터 전용 액션 체크
        const masterOnlyActions = ['create_church_admin', 'delete_admin', 'list_all_admins', 'get_church_stats', 'delete_church'];
        if (masterOnlyActions.includes(action) && !isGlobalMaster) {
            return NextResponse.json({ success: false, error: "마스터 권한이 필요한 작업입니다." }, { status: 403 });
        }

        // 2. 일반 교회 관리자 권한 체크 (본인 교회만 가능)
        if (!isGlobalMaster && action !== 'create_trial') {
            const targetCid = (church_id || body.target_church_id || '').toLowerCase();
            const userCid = (adminInfo?.church_id || '').toLowerCase();

            if (!adminInfo || (targetCid && userCid !== targetCid)) {
                return NextResponse.json({ success: false, error: "이 작업을 수행할 권한이 없습니다." }, { status: 403 });
            }
        }

        // 관리자 추가
        if (action === 'add_admin') {
            let targetEmail = email;
            let targetUserId = user_id;

            // [개편] 이름, 전화번호, 생년월일로 유저 찾기 (이메일이 없는 경우 대비)
            if (!email && body.name && body.phone && body.birthdate) {
                const nameStr = body.name.trim();
                const phoneStr = body.phone.trim();
                const birthStr = body.birthdate.trim();

                // 입력값 정규화
                const cleanPhone = phoneStr.replace(/[^0-9]/g, '');
                const formattedPhone = cleanPhone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');

                let isoBirthdate = birthStr;
                if (birthStr.length === 8 && /^\d+$/.test(birthStr)) {
                    isoBirthdate = birthStr.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
                }

                const { data: matchedUsers, error: searchError } = await supabaseAdmin
                    .from('profiles')
                    .select('id, email, full_name')
                    .eq('full_name', nameStr)
                    .or(`phone.eq.${cleanPhone},phone.eq.${formattedPhone}`)
                    .or(`birthdate.eq.${birthStr},birthdate.eq.${isoBirthdate}`);

                if (searchError) throw searchError;
                if (!matchedUsers || matchedUsers.length === 0) {
                    return NextResponse.json({ error: '일치하는 성도 정보를 찾을 수 없습니다. 이름, 번호, 생년월일을 정확히 확인해주세요.' }, { status: 404 });
                }
                if (matchedUsers.length > 1) {
                    return NextResponse.json({ error: '동일한 정보를 가진 성도가 여러 명입니다. 시스템 관리자에게 문의하세요.' }, { status: 400 });
                }

                targetUserId = matchedUsers[0].id;
                targetEmail = matchedUsers[0].email || `${targetUserId}@anonymous.local`; // [통일] anonymous.local 도메인으로 맞춤
            }

            if (!targetEmail) {
                return NextResponse.json({ error: '대상자의 이메일 또는 식별 정보가 부족합니다.' }, { status: 400 });
            }

            const formattedEmail = targetEmail.toLowerCase().trim();
            const adminPayload: any = { email: formattedEmail, role };
            if (church_id) adminPayload.church_id = church_id.trim();
            if (targetUserId) adminPayload.user_id = targetUserId; // [추가] user_id 추가 (매칭성 향상)

            // 1차 시도: church_id 포함하여 저장
            let result: any = await supabaseAdmin
                .from('app_admins')
                .upsert([adminPayload], { onConflict: 'email' })
                .select();

            let data = result.data;
            let error = result.error;

            if (error) {
                console.warn("[Admin API] Failed to add admin with church_id, retrying without it...", error.message);
                delete adminPayload.church_id;
                const retryResult: any = await supabaseAdmin
                    .from('app_admins')
                    .upsert([adminPayload], { onConflict: 'email' })
                    .select();

                if (retryResult.error) throw retryResult.error;
                data = retryResult.data;
            }

            // 프로필 이메일 동기화 (가상 이메일 생성 포함)
            if (targetUserId) {
                await supabaseAdmin
                    .from('profiles')
                    .update({ email: formattedEmail })
                    .eq('id', targetUserId);
            }

            // [알림] 새 관리자로 등록되었음을 해당 유저에게 알림
            try {
                const { data: profile } = await supabaseAdmin.from('profiles').select('id, full_name').eq('email', formattedEmail).maybeSingle();
                if (profile) {
                    // 1. 대상자에게 알림
                    await supabaseAdmin.from('notifications').insert([{
                        user_id: profile.id,
                        actor_name: '시스템',
                        type: 'admin_notice',
                        title: '👑 관리자 권한 부여',
                        content: `${church_id} 교회의 관리자로 지정되었습니다. 재로그인 후 확인해 주세요.`,
                        is_read: false
                    }]);

                    const { data: subsData } = await supabaseAdmin.from('push_subscriptions').select('subscription').eq('user_id', profile.id);
                    if (subsData && subsData.length > 0) {
                        for (const sub of subsData) {
                            if (!sub.subscription) continue;
                            try {
                                await webpush.sendNotification(sub.subscription, JSON.stringify({
                                    title: '👑 관리자 권한 부여',
                                    body: `${church_id} 교회의 관리자로 지정되었습니다. 재로그인 후 확인해 주세요.`,
                                    url: '/?view=admin',
                                    userId: profile.id
                                }));
                            } catch (e) { }
                        }
                    }

                    // 2. 다른 슈퍼 관리자들에게도 알림 (투명성 확보)
                    const { data: superAdmins } = await supabaseAdmin.from('app_admins').select('email').eq('role', 'super_admin');
                    if (superAdmins && superAdmins.length > 0) {
                        const saEmails = superAdmins.filter(sa => sa.email !== formattedEmail).map(sa => sa.email);
                        const { data: saProfiles } = await supabaseAdmin.from('profiles').select('id').in('email', saEmails);
                        if (saProfiles) {
                            for (const saP of saProfiles) {
                                await supabaseAdmin.from('notifications').insert([{
                                    user_id: saP.id,
                                    actor_name: '시스템',
                                    type: 'system',
                                    title: '📢 신규 관리자 등록 알림',
                                    content: `${profile.full_name || formattedEmail}님이 ${church_id}의 관리자로 등록되었습니다.`,
                                    is_read: false
                                }]);
                            }
                        }
                    }
                }
            } catch (notiErr) { console.error("Notification failed:", notiErr); }

            return NextResponse.json(data);
        }

        // 새 교회 및 관리자 지정 (슈퍼관리자용)
        if (action === 'create_church_admin') {
            const { target_church_id } = body;
            let targetEmail = email;
            let matchedUserId = null;

            // [개편] 이름, 전화번호, 생년월일로 유저 찾기
            if (!email && body.name && body.phone && body.birthdate) {
                const nameStr = body.name.trim();
                const phoneStr = body.phone.trim();
                const birthStr = body.birthdate.trim();

                const cleanPhone = phoneStr.replace(/[^0-9]/g, '');
                const formattedPhone = cleanPhone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');

                let isoBirthdate = birthStr;
                if (birthStr.length === 8 && /^\d+$/.test(birthStr)) {
                    isoBirthdate = birthStr.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
                }

                const { data: matchedUsers, error: searchError } = await supabaseAdmin
                    .from('profiles')
                    .select('id, email, full_name')
                    .eq('full_name', nameStr)
                    .or(`phone.eq.${cleanPhone},phone.eq.${formattedPhone}`)
                    .or(`birthdate.eq.${birthStr},birthdate.eq.${isoBirthdate}`);

                if (searchError) throw searchError;

                if (matchedUsers && matchedUsers.length > 0) {
                    if (matchedUsers.length > 1) {
                        return NextResponse.json({ error: '동일한 정보를 가진 성도가 여러 명입니다. 시스템 관리자에게 문의하세요.' }, { status: 400 });
                    }
                    targetEmail = matchedUsers[0].email || `${matchedUsers[0].id}@church.local`;
                    matchedUserId = matchedUsers[0].id;
                } else {
                    // [핵심 해결] 일치하는 성도가 없으면 새로 생성 (가계정)
                    console.log(`[Admin API] No matching user found. Creating new profile for: ${nameStr}`);

                    const cleanPhone = phoneStr.replace(/[^0-9]/g, '');
                    const formattedPhone = cleanPhone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
                    let isoBirthdate = birthStr;
                    if (birthStr.length === 8 && /^\d+$/.test(birthStr)) {
                        isoBirthdate = birthStr.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
                    }

                    const { data: newProfile, error: createError } = await supabaseAdmin
                        .from('profiles')
                        .insert([{
                            full_name: nameStr,
                            phone: formattedPhone,
                            birthdate: isoBirthdate,
                            church_id: target_church_id || 'pending',
                            is_approved: true,
                            email: `admin_${Date.now()}@somy.local` // 가상 이메일 생성
                        }])
                        .select()
                        .single();

                    if (createError) {
                        console.error("[Admin API] Profile creation failed:", createError);
                        throw new Error("신규 관리자 프로필 생성에 실패했습니다: " + createError.message);
                    }

                    targetEmail = newProfile.email;
                    matchedUserId = newProfile.id;
                }
            }

            if (!targetEmail) {
                return NextResponse.json({ error: '대상자의 이메일 또는 식별 정보가 부족합니다.' }, { status: 400 });
            }

            const formattedEmail = targetEmail.toLowerCase().trim();
            const finalChurchId = (target_church_id || '').trim();

            // 0. 프로필 정보의 교회 식별자 업데이트 (매우 중요: 재로그인 시 이 정보를 기준으로 교회 앱이 세팅됨)
            if (matchedUserId) {
                await supabaseAdmin.from('profiles').update({ church_id: finalChurchId }).eq('id', matchedUserId);
                console.log(`[Admin API] Updated profile(${matchedUserId}) church_id to: ${finalChurchId}`);
            } else {
                // 이메일만 있는 경우 이메일로 프로필 찾아서 업데이트
                await supabaseAdmin.from('profiles').update({ church_id: finalChurchId }).eq('email', formattedEmail);
            }

            // 1. 관리자 권한 부여
            const adminPayload: any = {
                email: formattedEmail,
                role: 'church_admin',
                church_id: finalChurchId,
                pin: body.pin || null, // [추가] PIN 번호 저장
                user_id: matchedUserId // [추가] user_id 즉시 연결 (매칭성 향상)
            };

            let result: any = await supabaseAdmin
                .from('app_admins')
                .upsert([adminPayload], { onConflict: 'email' })
                .select();

            let data = result.data;
            let error = result.error;

            if (error) {
                console.warn("[Admin API] Failed to create church admin with church_id, retrying without it...", error.message);
                const fallbackPayload = { email: formattedEmail, role: 'church_admin' };
                const retryResult: any = await supabaseAdmin
                    .from('app_admins')
                    .upsert([fallbackPayload], { onConflict: 'email' })
                    .select();
                if (retryResult.error) throw retryResult.error;
                data = retryResult.data;
            }

            // 2. 해당 교회의 기본 설정값 생성
            try {
                const { data: template } = await supabaseAdmin
                    .from('church_settings')
                    .select('*')
                    .order('id', { ascending: true })
                    .limit(1)
                    .maybeSingle();

                if (template && finalChurchId !== 'jesus-in') {
                    const { id, created_at, ...cleanTemplate } = template;
                    const newSetting: any = {
                        ...cleanTemplate,
                        church_id: finalChurchId,
                        church_name: '',
                        app_subtitle: '',
                        // 예수인교회 전용 데이터는 초기화하여 '정보가 그대로 넘어가는 문제' 해결
                        church_logo_url: '',
                        sermon_url: '',
                        manual_sermon_url: '',
                        sermon_summary: '',
                        sermon_q1: '',
                        sermon_q2: '',
                        sermon_q3: '',
                        pastor_column_title: '',
                        pastor_column_content: '',
                        event_poster_url: '',
                        event_poster_visible: false
                    };

                    await supabaseAdmin
                        .from('church_settings')
                        .upsert([newSetting], { onConflict: 'church_id' });
                }
            } catch (setErr) { console.error("Setting creation failed:", setErr); }

            // [알림] 새 교회 관리자로 지정되었음을 알림
            try {
                const { data: profile } = await supabaseAdmin.from('profiles').select('id, full_name').eq('email', formattedEmail).maybeSingle();
                if (profile) {
                    // 1. 대상자에게 알림
                    await supabaseAdmin.from('notifications').insert([{
                        user_id: profile.id,
                        actor_name: '시스템',
                        type: 'admin_notice',
                        title: '⛪ 새 교회 관리자 지정',
                        content: `새로운 교회(${target_church_id})의 관리자로 지정되었습니다. 재로그인 후 확인해 주세요.`,
                        is_read: false
                    }]);

                    const { data: subsData } = await supabaseAdmin.from('push_subscriptions').select('subscription').eq('user_id', profile.id);
                    if (subsData && subsData.length > 0) {
                        for (const sub of subsData) {
                            if (!sub.subscription) continue;
                            try {
                                await webpush.sendNotification(sub.subscription, JSON.stringify({
                                    title: '⛪ 새 교회 관리자 지정',
                                    body: `새로운 교회(${target_church_id})의 관리자로 지정되었습니다.`,
                                    url: '/?view=admin',
                                    userId: profile.id
                                }));
                            } catch (e) { }
                        }
                    }

                    // 2. 슈퍼 관리자들에게 알림
                    const { data: superAdmins } = await supabaseAdmin.from('app_admins').select('email').eq('role', 'super_admin');
                    if (superAdmins && superAdmins.length > 0) {
                        const saEmails = superAdmins.filter(sa => sa.email !== formattedEmail).map(sa => sa.email);
                        const { data: saProfiles } = await supabaseAdmin.from('profiles').select('id').in('email', saEmails);
                        if (saProfiles) {
                            for (const saP of saProfiles) {
                                await supabaseAdmin.from('notifications').insert([{
                                    user_id: saP.id,
                                    actor_name: '시스템',
                                    type: 'system',
                                    title: '📢 새 교회 및 관리자 생성',
                                    content: `${target_church_id} 교회와 관리자(${profile.full_name || formattedEmail})가 생성되었습니다.`,
                                    is_read: false
                                }]);
                            }
                        }
                    }
                }
            } catch (notiErr) { console.error("Notification failed:", notiErr); }

            return NextResponse.json(data);
        }

        // 관리자 삭제 (슈퍼관리자용)
        if (action === 'delete_admin') {
            const { target_email } = body;
            if (!target_email) throw new Error('삭제할 관리자 이메일이 없습니다.');

            // [알림용 데이터 확보]
            let deletedProfileId = null;
            let deletedName = target_email;
            try {
                const { data: p } = await supabaseAdmin.from('profiles').select('id, full_name').eq('email', target_email.toLowerCase().trim()).maybeSingle();
                if (p) {
                    deletedProfileId = p.id;
                    deletedName = p.full_name || target_email;
                }
            } catch (e) { }

            const { error } = await supabaseAdmin
                .from('app_admins')
                .delete()
                .eq('email', target_email.toLowerCase().trim());

            if (error) throw error;

            // [알림 전송]
            try {
                // 1. 당사자에게 알림 (권한 회수 알림)
                if (deletedProfileId) {
                    await supabaseAdmin.from('notifications').insert([{
                        user_id: deletedProfileId,
                        actor_name: '시스템',
                        type: 'system',
                        title: '🚫 관리자 권한 회수',
                        content: '관리자 권한이 해제되었습니다. 궁금하신 사항은 문의해 주세요.',
                        is_read: false
                    }]);
                }

                // 2. 다른 슈퍼 관리자들에게 알림
                const { data: superAdmins } = await supabaseAdmin.from('app_admins').select('email').eq('role', 'super_admin');
                if (superAdmins && superAdmins.length > 0) {
                    const saEmails = superAdmins.filter(sa => sa.email !== target_email.toLowerCase().trim()).map(sa => sa.email);
                    const { data: saProfiles } = await supabaseAdmin.from('profiles').select('id').in('email', saEmails);
                    if (saProfiles) {
                        for (const saP of saProfiles) {
                            await supabaseAdmin.from('notifications').insert([{
                                user_id: saP.id,
                                actor_name: '시스템',
                                type: 'system',
                                title: '📢 관리자 삭제 알림',
                                content: `${deletedName}님의 관리자 권한이 해제되었습니다.`,
                                is_read: false
                            }]);
                        }
                    }
                }
            } catch (notiErr) { console.error("Deletion Notification failed:", notiErr); }

            return NextResponse.json({ success: true });
        }

        // [신규] 관리자 PIN 번호 변경
        if (action === 'update_admin_pin') {
            const { target_user_id, new_pin } = body;
            if (!target_user_id || !new_pin) throw new Error('대상자 ID 또는 새 PIN 번호가 없습니다.');

            const { data, error } = await supabaseAdmin
                .from('app_admins')
                .update({ pin: new_pin })
                .eq('user_id', target_user_id)
                .select();

            if (error) throw error;
            return NextResponse.json({ success: true, data });
        }

        // 성도 승인 처리
        if (action === 'approve_user') {
            const { data, error } = await supabaseAdmin
                .from('profiles')
                .update({ is_approved })
                .eq('id', user_id)
                .select();
            if (error) throw error;

            // [알림] 승인되었을 경우 사용자에게 알림 전송
            if (is_approved) {
                try {
                    await supabaseAdmin.from('notifications').insert([{
                        user_id,
                        actor_name: '시스템',
                        type: 'system',
                        title: '🎉 계정 승인 완료',
                        content: '축하드립니다! 교회 앱 사용 권한이 승인되었습니다. 지금 바로 이용해 보세요!',
                        is_read: false
                    }]);

                    const { data: subsData } = await supabaseAdmin.from('push_subscriptions').select('subscription').eq('user_id', user_id);
                    if (subsData && subsData.length > 0) {
                        for (const sub of subsData) {
                            if (!sub.subscription) continue;
                            try {
                                await webpush.sendNotification(sub.subscription, JSON.stringify({
                                    title: '🎉 계정 승인 완료',
                                    body: '교회 앱 사용 권한이 승인되었습니다!',
                                    url: '/',
                                    userId: user_id
                                }));
                            } catch (e) { }
                        }
                    }

                    // 2. 다른 슈퍼 관리자들에게도 승인 알림 전송 (통계 확인용)
                    const { data: approvedUser } = await supabaseAdmin.from('profiles').select('full_name, church_id').eq('id', user_id).maybeSingle();
                    const { data: superAdmins } = await supabaseAdmin.from('app_admins').select('email').eq('role', 'super_admin');
                    if (superAdmins && superAdmins.length > 0) {
                        const saEmails = superAdmins.map(sa => sa.email);
                        const { data: saProfiles } = await supabaseAdmin.from('profiles').select('id').in('email', saEmails);
                        if (saProfiles) {
                            for (const saP of saProfiles) {
                                if (saP.id === user_id) continue;
                                await supabaseAdmin.from('notifications').insert([{
                                    user_id: saP.id,
                                    actor_name: '시스템',
                                    type: 'system',
                                    title: '📢 새 성도 승인 알림',
                                    content: `${approvedUser?.full_name || '새 성도'}님이 ${approvedUser?.church_id || '교회'}에 승인되었습니다.`,
                                    is_read: false
                                }]);
                            }
                        }
                    }
                } catch (notiErr) { console.error("Approval notification failed:", notiErr); }
            }

            return NextResponse.json(data);
        }

        // [추가] 신규 기기 로그인 알림 확인 처리
        if (action === 'clear_new_login') {
            const { data, error } = await supabaseAdmin
                .from('profiles')
                .update({ is_new_login: false })
                .eq('id', user_id);
            if (error) throw error;
            return NextResponse.json({ success: true });
        }

        // 선택 성도 일괄 승인/해제
        if (action === 'bulk_approve_users') {
            const { ids, approve = true } = body;
            if (!ids || !Array.isArray(ids)) throw new Error('처리할 ID 목록이 없습니다.');

            const { data, error } = await supabaseAdmin
                .from('profiles')
                .update({ is_approved: approve })
                .in('id', ids)
                .select();

            if (error) throw error;

            // 알림 처리
            if (approve) {
                try {
                    const notis = ids.map(id => ({
                        user_id: id,
                        actor_name: '시스템',
                        type: 'system',
                        title: '🎉 계정 승인 완료',
                        content: '축하드립니다! 교회 앱 사용 권한이 승인되었습니다.',
                        is_read: false
                    }));
                    await supabaseAdmin.from('notifications').insert(notis);
                } catch (e) { console.error("Bulk approval notification failed:", e); }
            }

            return NextResponse.json({ success: true, count: data?.length });
        }

        // 성도 상세 정보 수정 (관리자용)
        if (action === 'update_member') {
            const { user_id, update_data } = body;
            const safeUpdateData = { ...update_data };

            // 1. DB에 없는 필드 제거
            if ('is_birthdate_lunar' in safeUpdateData) {
                delete (safeUpdateData as any).is_birthdate_lunar;
            }

            // [추가] id 필드가 포함된 경우 업데이트 시 오류 방지
            if ('id' in safeUpdateData) delete (safeUpdateData as any).id;

            // 2. 날짜 형식 보정 (빈 문자열은 null로)
            const dateFields = ['birthdate', 'created_at'];
            dateFields.forEach(field => {
                if (safeUpdateData[field] === "") {
                    safeUpdateData[field] = null;
                }
            });

            // 3. 성별 등 공백 문자열 처리
            if (safeUpdateData.gender === "") safeUpdateData.gender = null;

            const { data, error } = await supabaseAdmin
                .from('profiles')
                .update(safeUpdateData)
                .eq('id', user_id)
                .select();

            if (error) {
                console.error("[UpdateMember Error]:", error);
                throw error;
            }
            return NextResponse.json(data);
        }

        // 개별 성도 추가
        if (action === 'add_member') {
            const { member_data } = body;
            const safeMemberData = { ...member_data };

            if (safeMemberData.birthdate === "") {
                safeMemberData.birthdate = null;
            }

            // [추가] 중복 체크 (휴대폰 번호 기준)
            const cleanPhone = safeMemberData.phone.replace(/[^0-9]/g, '');
            const formattedPhone = cleanPhone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');

            const { data: existing } = await supabaseAdmin
                .from('profiles')
                .select('id, full_name')
                .eq('church_id', safeMemberData.church_id)
                .or(`phone.eq.${cleanPhone},phone.eq.${formattedPhone},phone.eq.${safeMemberData.phone}`)
                .maybeSingle();

            if (existing) {
                return NextResponse.json({ error: `이미 등록된 성도(${existing.full_name})가 있습니다.` }, { status: 400 });
            }

            const { data, error } = await supabaseAdmin
                .from('profiles')
                .insert([safeMemberData])
                .select();
            if (error) throw error;
            return NextResponse.json(data);
        }

        // 개별 성도 삭제
        if (action === 'delete_member') {
            const targetId = user_id || body.id;
            if (!targetId) throw new Error('삭제할 성도의 ID가 없습니다.');

            const { error } = await supabaseAdmin
                .from('profiles')
                .delete()
                .eq('id', targetId);
            if (error) throw error;
            return NextResponse.json({ success: true });
        }

        // 선택 성도 일괄 삭제
        if (action === 'bulk_delete_members') {
            const { ids } = body;
            if (!ids || !Array.isArray(ids) || ids.length === 0) throw new Error('삭제할 성도 ID 목록이 없습니다.');

            const { error } = await supabaseAdmin
                .from('profiles')
                .delete()
                .in('id', ids);
            if (error) throw error;
            return NextResponse.json({ success: true });
        }

        // 전체 성도 삭제
        if (action === 'clear_all_members') {
            const { church_id } = body;
            const { error } = await supabaseAdmin
                .from('profiles')
                .delete()
                .eq('church_id', church_id || 'somy-main');
            if (error) throw error;
            return NextResponse.json({ success: true });
        }

        // [추가] 모든 미인증/신규 유저(가계정, 카카오 신규, 익명 등)를 일괄 승인 완료 상태로 전환
        if (action === 'bulk_approve_unverified') {
            const { church_id } = body;
            const targetChurchId = church_id || '';

            const { data: targets, error: fetchErr } = await supabaseAdmin
                .from('profiles')
                .select('id')
                .eq('church_id', targetChurchId)
                .or('email.ilike.%@church.local,email.ilike.%@noemail.local,email.ilike.%@anonymous.local,email.ilike.%@kakao.somy-qt.local')
                .eq('is_approved', false);

            if (fetchErr) throw fetchErr;

            if (targets && targets.length > 0) {
                const targetIds = targets.map(t => t.id);
                const { error: updateErr } = await supabaseAdmin
                    .from('profiles')
                    .update({ is_approved: true })
                    .in('id', targetIds);

                if (updateErr) throw updateErr;
                return NextResponse.json({ success: true, count: targetIds.length });
            }
            return NextResponse.json({ success: true, count: 0 });
        }

        // [추가] '성도', '사용자' 처럼 이름이 성의 없는 유령 계정들 일괄 삭제
        if (action === 'delete_junk_members') {
            const { church_id } = body;
            const targetChurchId = church_id || '';
            const junkNames = ['성도', '이름 없음', '이름미입력', '사용자', '큐티', 'somy', '.', ''];

            const { data: targets, error: fetchErr } = await supabaseAdmin
                .from('profiles')
                .select('id, full_name')
                .eq('church_id', targetChurchId);

            if (fetchErr) throw fetchErr;

            const junkIds = (targets || [])
                .filter(m => !m.full_name || junkNames.includes(m.full_name.trim()))
                .map(m => m.id);

            if (junkIds.length > 0) {
                const { error: delErr } = await supabaseAdmin
                    .from('profiles')
                    .delete()
                    .in('id', junkIds);
                if (delErr) throw delErr;
                return NextResponse.json({ success: true, count: junkIds.length });
            }
            return NextResponse.json({ success: true, count: 0 });
        }

        // [추가] 미인증 유저(업로드 전용 가계정)를 승인 대기 상태로 초기화
        if (action === 'reset_unverified_status') {
            const { church_id } = body;
            const targetChurchId = church_id || '';

            // @church.local 또는 @noemail.local인 성도들은 실제 로그인을 아직 안 한 업로드 데이터임
            const { data: targets, error: fetchErr } = await supabaseAdmin
                .from('profiles')
                .select('id, full_name')
                .eq('church_id', targetChurchId)
                .or('email.ilike.%@church.local,email.ilike.%@noemail.local');

            if (fetchErr) throw fetchErr;

            if (targets && targets.length > 0) {
                // 일괄 미승인 처리 (관리자가 명시적으로 승인한 사람만 남김)
                const filteredIds = targets.map(t => t.id);

                if (filteredIds.length > 0) {
                    const { error: updateErr } = await supabaseAdmin
                        .from('profiles')
                        .update({ is_approved: false })
                        .in('id', filteredIds);

                    if (updateErr) throw updateErr;
                }
                return NextResponse.json({ success: true, count: filteredIds.length });
            }

            return NextResponse.json({ success: true, count: 0 });
        }

        // 일괄 프라이버시 설정
        if (action === 'bulk_update_privacy') {
            const { church_id, field, value } = body;
            const targetChurchId = church_id || '';

            // church_id가 일치하거나, NULL인 경우(초기 데이터) 모두 업데이트
            const { error } = await supabaseAdmin
                .from('profiles')
                .update({ [field]: value })
                .or(`church_id.eq.${targetChurchId},church_id.is.null`);

            if (error) throw error;
            return NextResponse.json({ success: true, targetChurchId });
        }

        // [추가] 은혜나눔(커뮤니티) 초기화
        if (action === 'reset_community') {
            const { church_id } = body;
            if (!church_id) throw new Error('교회 식별자가 없습니다.');

            // 댓글 먼저 삭제 후 포스트 삭제
            const { data: posts } = await supabaseAdmin.from('community_posts').select('id').eq('church_id', church_id);
            if (posts && posts.length > 0) {
                const postIds = posts.map(p => p.id);
                // @ts-ignore
                await supabaseAdmin.from('community_comments').delete().in('post_id', postIds);
            }
            const { error } = await supabaseAdmin.from('community_posts').delete().eq('church_id', church_id);
            if (error) throw error;
            return NextResponse.json({ success: true });
        }

        // [추가] 감사일기 초기화
        if (action === 'reset_thanksgiving') {
            const { church_id } = body;
            if (!church_id) throw new Error('교회 식별자가 없습니다.');

            // 댓글 먼저 삭제 후 일기 삭제
            const { data: diaries } = await supabaseAdmin.from('thanksgiving_diaries').select('id').eq('church_id', church_id);
            if (diaries && diaries.length > 0) {
                const diaryIds = diaries.map(d => d.id);
                // @ts-ignore
                await supabaseAdmin.from('thanksgiving_comments').delete().in('diary_id', diaryIds);
            }
            const { error } = await supabaseAdmin.from('thanksgiving_diaries').delete().eq('church_id', church_id);
            if (error) throw error;
            return NextResponse.json({ success: true });
        }

        // [추가] 큐티 통계(큐티왕) 초기화
        if (action === 'reset_qt_stats') {
            const { church_id } = body;
            if (!church_id) throw new Error('교회 식별자가 없습니다.');

            const { error } = await supabaseAdmin.from('qt_completions').delete().eq('church_id', church_id);
            if (error) throw error;
            return NextResponse.json({ success: true });
        }
        // [추가] 교회 전체 데이터 삭제 (슈퍼관리자)
        if (action === 'delete_church') {
            const { target_church_id } = body;
            if (!target_church_id || target_church_id === 'jesus-in') {
                throw new Error('삭제할 수 없는 교회거나 식별자가 없습니다.');
            }

            console.log(`[SuperAdmin] DELETING CHURCH: ${target_church_id}`);

            // 1. 교회 설정 삭제
            await supabaseAdmin.from('church_settings').delete().eq('church_id', target_church_id);

            // 2. 해당 교회 관리자들 권한 삭제
            await supabaseAdmin.from('app_admins').delete().eq('church_id', target_church_id);

            // 3. 성도들의 church_id 초기화 (완전 삭제는 위험하므로 소속만 'deleted'로 변경하거나 유지)
            // 여기서는 깔끔하게 'deleted-church' 등으로 마킹하여 목록에서 사라지게 함
            await supabaseAdmin.from('profiles').update({ church_id: `deleted-${target_church_id}` }).eq('church_id', target_church_id);

            return NextResponse.json({ success: true });
        }



        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

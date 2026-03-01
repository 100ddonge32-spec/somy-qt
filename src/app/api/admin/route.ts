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

// 관리자 권한 및 성도 목록 조회
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');
    const action = searchParams.get('action'); // 'check_admin' | 'list_members'

    try {
        if (action === 'check_admin') {
            const userId = searchParams.get('user_id');
            let email = searchParams.get('email');

            // [추가] 환경변수 또는 하드코딩된 슈퍼어드민 리스트 (부팅용)
            const HARDCODED_ADMINS = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "pastorbaek@kakao.com,kakao_4761026797@kakao.somy-qt.local").toLowerCase().split(',').map(e => e.trim());

            // [보안 지칭] 익명 로그인 유저의 실명 인증 보완
            if (userId && (!email || email.includes('anonymous.local') || email === 'null' || email === 'undefined')) {
                const { data: profile } = await supabaseAdmin
                    .from('profiles')
                    .select('email, full_name, church_id')
                    .eq('id', userId)
                    .maybeSingle();

                if (profile && profile.email && !profile.email.includes('anonymous.local')) {
                    email = profile.email;
                }
            }

            // [핵심] 이메일 기반 권한 조회
            let query = supabaseAdmin.from('app_admins').select('*');

            if (email && email !== 'undefined' && email !== 'null') {
                const formattedEmail = email.toLowerCase().trim();

                // [부팅 로직] 하드코딩된 리스트에 있으면 즉시 슈퍼관리자로 등록/인정
                if (HARDCODED_ADMINS.includes(formattedEmail)) {
                    await supabaseAdmin.from('app_admins').upsert({
                        email: formattedEmail,
                        role: 'super_admin',
                        church_id: 'jesus-in',
                        user_id: userId || null
                    }, { onConflict: 'email' });
                    return NextResponse.json({ email: formattedEmail, role: 'super_admin', church_id: 'jesus-in' });
                }

                query = query.eq('email', formattedEmail);
            } else if (userId) {
                // [복구] user_id 컬럼이 없으므로 email 필드에 저장된 ID 기반으로 검색
                query = query.or(`email.eq.${userId},email.ilike.%${userId}%`);
            } else {
                return NextResponse.json({ role: 'user' });
            }

            const { data, error } = await query.limit(1);

            // [보안 지침] 이름('백동희')만으로 권한을 자동 생성하거나 부여하지 않음 (카카오 로그인 전용)
            // 여기까지 데이터가 없으면 일반 사용자로 간주합니다.
            return NextResponse.json((data && data.length > 0) ? data[0] : { role: 'user' });
        }


        if (action === 'list_members') {
            const churchId = searchParams.get('church_id');
            let query = supabaseAdmin.from('profiles').select('*');

            if (churchId) {
                query = query.eq('church_id', churchId);
            }

            let { data, error } = await query.order('created_at', { ascending: false });
            if (error) throw error;

            // [정석 보완] 이름이 '성도'이면서 전화번호도 없는 '유령 계정'은 관리자 목록에서 제외 (UI 정리)
            if (data) {
                data = data.filter(m => {
                    const isGhost = (m.full_name === '성도' || m.full_name === '이름 없음') && !m.phone;
                    return !isGhost || m.is_approved; // 승인된 경우는 유령이라도 일단 보여줌
                });
            }

            return NextResponse.json(data);
        }

        if (action === 'get_church_stats') {
            // 모든 성도 정보를 가져와서 교회별로 그룹화
            const { data: profiles, error } = await supabaseAdmin
                .from('profiles')
                .select('church_id');

            if (error) throw error;

            const stats: { [key: string]: number } = {};
            profiles.forEach(p => {
                const cid = p.church_id || 'jesus-in';
                stats[cid] = (stats[cid] || 0) + 1;
            });

            return NextResponse.json(stats);
        }

        if (action === 'list_all_admins') {
            // Step 1: app_admins 전체 조회
            const { data: admins, error: adminsError } = await supabaseAdmin
                .from('app_admins')
                .select('email, role, church_id, created_at, user_id')
                .order('created_at', { ascending: false });

            if (adminsError) {
                console.error('[list_all_admins] Failed to fetch admins:', adminsError.message);
                throw adminsError;
            }
            if (!admins || admins.length === 0) return NextResponse.json([]);

            // Step 2: 등록된 이메일 또는 user_id로 profiles 별도 조회
            const emails = admins.map((a: any) => a.email?.toLowerCase()).filter(Boolean);
            const userIds = admins.map((a: any) => a.user_id).filter(Boolean);

            const { data: profiles } = await supabaseAdmin
                .from('profiles')
                .select('id, email, full_name, avatar_url')
                .or(`email.in.(${emails.map(e => `"${e}"`).join(',')})${userIds.length > 0 ? `,id.in.(${userIds.map(id => `"${id}"`).join(',')})` : ''}`);

            // Step 3: 매핑 생성 (Email 우선, 그 다음 ID)
            const profileMapByEmail: Record<string, any> = {};
            const profileMapById: Record<string, any> = {};

            (profiles || []).forEach((p: any) => {
                if (p.email) profileMapByEmail[p.email.toLowerCase()] = p;
                if (p.id) profileMapById[p.id] = p;
            });

            const formattedData = admins.map((admin: any) => {
                const profile = profileMapByEmail[admin.email?.toLowerCase()] || profileMapById[admin.user_id] || null;
                return {
                    ...admin,
                    name: profile?.full_name || '이름 없음',
                    avatar_url: profile?.avatar_url || null
                };
            });

            console.log('[list_all_admins] Returning', formattedData.length, 'admins');
            return NextResponse.json(formattedData);
        }


        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// 조지 관리자 지정 및 성도 승인 처리
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { action, email, user_id, is_approved, church_id, role } = body;

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
                if (!matchedUsers || matchedUsers.length === 0) {
                    return NextResponse.json({ error: '일치하는 성도 정보를 찾을 수 없습니다. 이름, 번호, 생년월일을 정확히 확인해주세요.' }, { status: 404 });
                }
                if (matchedUsers.length > 1) {
                    return NextResponse.json({ error: '동일한 정보를 가진 성도가 여러 명입니다. 시스템 관리자에게 문의하세요.' }, { status: 400 });
                }
                targetEmail = matchedUsers[0].email || `${matchedUsers[0].id}@church.local`;
                matchedUserId = matchedUsers[0].id;
            }

            if (!targetEmail) {
                return NextResponse.json({ error: '대상자의 이메일 또는 식별 정보가 부족합니다.' }, { status: 400 });
            }

            const formattedEmail = targetEmail.toLowerCase().trim();
            const finalChurchId = (target_church_id || 'jesus-in').trim();

            // 0. 프로필 정보의 교회 식별자 업데이트 (매우 중요: 재로그인 시 이 정보를 기준으로 교회 앱이 세팅됨)
            if (matchedUserId) {
                await supabaseAdmin.from('profiles').update({ church_id: finalChurchId }).eq('id', matchedUserId);
                console.log(`[Admin API] Updated profile(${matchedUserId}) church_id to: ${finalChurchId}`);
            } else {
                // 이메일만 있는 경우 이메일로 프로필 찾아서 업데이트
                await supabaseAdmin.from('profiles').update({ church_id: finalChurchId }).eq('email', formattedEmail);
            }

            // 1. 관리자 권한 부여
            const adminPayload: any = { email: formattedEmail, role: 'church_admin', church_id: finalChurchId };

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
                        church_name: `${finalChurchId} 교회`,
                        app_subtitle: '새로운 교회 공동체에 오신 것을 환영합니다.',
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
                .eq('church_id', church_id || 'jesus-in');
            if (error) throw error;
            return NextResponse.json({ success: true });
        }

        // [추가] 미인증 유저(업로드 전용 가계정)를 승인 대기 상태로 초기화
        if (action === 'reset_unverified_status') {
            const { church_id } = body;
            const targetChurchId = church_id || 'jesus-in';

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
            const targetChurchId = church_id || 'jesus-in';

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

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

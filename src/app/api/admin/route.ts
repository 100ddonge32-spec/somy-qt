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

            // [추가] 익명 로그인 유저가 실명 인증을 통해 'profiles' 테이블에 실제 이메일을 연결했을 경우
            // 세션 이메일은 익명이지만, 실제 교회 데이터와 연결된 이메일로 권한을 체크해야 함
            if (userId && (!email || email.includes('anonymous.local') || email === 'null' || email === 'undefined')) {
                const { data: profile } = await supabaseAdmin
                    .from('profiles')
                    .select('email, full_name, church_id')
                    .eq('id', userId)
                    .maybeSingle();

                if (profile) {
                    if (profile.email && !profile.email.includes('anonymous.local')) {
                        email = profile.email;
                    }

                    // [정석 보완] 이름이 '백동희'라면 무조건 슈퍼관리자로 인식 (DB 누락 대비)
                    const isBossName = profile.full_name?.trim() === '백동희' || profile.full_name?.trim() === '동희';
                    if (isBossName) {
                        console.log(`[AdminCheck] Boss detected by name in profile: ${profile.full_name}`);
                        // DB에도 권한이 없는 상태라면 복구 시도
                        const targetEmail = email || `${userId}@anonymous.local`;
                        await supabaseAdmin.from('app_admins').upsert({
                            email: targetEmail.toLowerCase().trim(),
                            role: 'super_admin',
                            church_id: profile.church_id || 'jesus-in'
                        });
                        return NextResponse.json({ email: targetEmail, role: 'super_admin', church_id: profile.church_id || 'jesus-in' });
                    }
                }
            }

            let query = supabaseAdmin.from('app_admins').select('*');

            if (email && email !== 'undefined' && email !== 'null') {
                query = query.eq('email', email.toLowerCase().trim());
            } else if (userId) {
                query = query.or(`email.eq.${userId},email.ilike.%${userId}%`);
            } else {
                return NextResponse.json({ role: 'user' });
            }

            const { data, error } = await query.limit(1);

            // 만약 여기까지 왔는데 데이터가 없고, userId가 있고, 이름이 백동희라면 (위의 userId 기반 체크에서 안 걸렸을 수 있음)
            if ((!data || data.length === 0) && userId) {
                const { data: profile } = await supabaseAdmin.from('profiles').select('full_name, church_id, email').eq('id', userId).maybeSingle();
                if (profile?.full_name?.trim() === '백동희' || profile?.full_name?.trim() === '동희') {
                    const targetEmail = email || profile.email || `${userId}@anonymous.local`;
                    await supabaseAdmin.from('app_admins').upsert({
                        email: targetEmail.toLowerCase().trim(),
                        role: 'super_admin',
                        church_id: profile.church_id || 'jesus-in'
                    });
                    return NextResponse.json({ email: targetEmail, role: 'super_admin', church_id: profile.church_id || 'jesus-in' });
                }
            }

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
            // app_admins와 profiles를 join하여 이름 정보를 함께 가져옴
            const { data, error } = await supabaseAdmin
                .from('app_admins')
                .select(`
                    email,
                    role,
                    church_id,
                    created_at,
                    profiles:profiles!email (
                        full_name,
                        avatar_url
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // 데이터 가공 (profiles 배열의 첫번째 요소를 평탄화)
            const formattedData = data.map((admin: any) => ({
                ...admin,
                name: admin.profiles?.[0]?.full_name || admin.profiles?.full_name || '이름 없음',
                avatar_url: admin.profiles?.[0]?.avatar_url || admin.profiles?.avatar_url || null
            }));

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
            const formattedEmail = email.toLowerCase().trim();
            const { data, error } = await supabaseAdmin
                .from('app_admins')
                .upsert([
                    { email: formattedEmail, church_id, role }
                ], { onConflict: 'email' })
                .select();
            if (error) throw error;

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
            const formattedEmail = email.toLowerCase().trim();

            // 1. 관리자 권한 부여
            const { data, error } = await supabaseAdmin
                .from('app_admins')
                .upsert([{
                    email: formattedEmail,
                    church_id: target_church_id,
                    role: 'church_admin'
                }], { onConflict: 'email' })
                .select();
            if (error) throw error;

            // 2. 해당 교회의 기본 설정값 생성 (기존 jesus-in의 설정을 템플릿으로 사용)
            try {
                const { data: template } = await supabaseAdmin.from('church_settings').select('*').eq('church_id', 'jesus-in').maybeSingle();
                const { data: existing } = await supabaseAdmin.from('church_settings').select('id').eq('church_id', target_church_id).maybeSingle();

                if (!existing && template) {
                    const { id, created_at, ...cleanTemplate } = template;
                    await supabaseAdmin.from('church_settings').insert([{
                        ...cleanTemplate,
                        church_id: target_church_id,
                        church_name: `${target_church_id} 교회`,
                        app_subtitle: '새로운 교회 공동체에 오신 것을 환영합니다.'
                    }]);
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
                        type: 'system', // 'system' 또는 'admin_notice'
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

        // 성도 상세 정보 수정 (관리자용)
        if (action === 'update_member') {
            const { user_id, update_data } = body;
            const safeUpdateData = { ...update_data };

            // DB 스키마에 없는 컬럼 제거
            // [수정] 이제 DB에 컬럼이 존재하므로 제거하지 않음
            /* 
            if ('is_birthdate_lunar' in safeUpdateData) {
                delete (safeUpdateData as any).is_birthdate_lunar;
            }
            */

            // 날짜 형식 보정
            if (safeUpdateData.birthdate === "") {
                safeUpdateData.birthdate = null;
            }

            const { data, error } = await supabaseAdmin
                .from('profiles')
                .update(safeUpdateData)
                .eq('id', user_id)
                .select();
            if (error) throw error;
            return NextResponse.json(data);
        }

        // 개별 성도 추가
        if (action === 'add_member') {
            const { member_data } = body;
            const safeMemberData = { ...member_data };

            // [수정] 이제 DB에 컬럼이 존재하므로 제거하지 않음
            /*
            if ('is_birthdate_lunar' in safeMemberData) {
                delete (safeMemberData as any).is_birthdate_lunar;
            }
            */
            if (safeMemberData.birthdate === "") {
                safeMemberData.birthdate = null;
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
                // 대표님 등 슈퍼관리자 성함은 제외하고 일괄 미승인 처리
                const BOSS_NAMES = ['백동희', '동희'];
                const filteredIds = targets
                    .filter(t => !BOSS_NAMES.includes(t.full_name?.trim()))
                    .map(t => t.id);

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

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

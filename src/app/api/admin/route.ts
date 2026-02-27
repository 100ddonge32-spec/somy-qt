import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
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
            const { data, error } = await supabaseAdmin
                .from('app_admins')
                .upsert([{ email: email.toLowerCase().trim(), church_id, role }])
                .select();
            if (error) throw error;
            return NextResponse.json(data);
        }

        // 성도 승인 처리
        if (action === 'approve_user') {
            const { data, error } = await supabaseAdmin
                .from('profiles')
                .update({ is_approved })
                .eq('id', user_id)
                .select();
            if (error) throw error;
            return NextResponse.json(data);
        }

        // 성도 상세 정보 수정 (관리자용)
        if (action === 'update_member') {
            const { user_id, update_data } = body;
            const safeUpdateData = { ...update_data };

            // DB 스키마에 없는 컬럼 제거
            if ('is_birthdate_lunar' in safeUpdateData) {
                delete (safeUpdateData as any).is_birthdate_lunar;
            }

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

            if ('is_birthdate_lunar' in safeMemberData) {
                delete (safeMemberData as any).is_birthdate_lunar;
            }
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

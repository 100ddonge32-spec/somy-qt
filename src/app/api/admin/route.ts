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
            const email = searchParams.get('email');

            let query = supabaseAdmin.from('app_admins').select('*');

            if (email && email !== 'undefined' && email !== 'null') {
                query = query.eq('email', email.toLowerCase().trim());
            } else if (userId) {
                // 이메일이 없는 익명 사용자의 경우 user_id 필드(추가 필요) 또는 email 필드에 id를 활용했을 수 있음
                // 여기서는 email 필드에 id를 넣었을 경우를 대비해 OR 조건으로 검색하거나 
                // email 필드 자체가 id를 포함하고 있는지 확인
                query = query.or(`email.eq.${userId},email.ilike.%${userId}%`);
            } else {
                return NextResponse.json({ role: 'user' });
            }

            const { data, error } = await query.limit(1);
            return NextResponse.json((data && data.length > 0) ? data[0] : { role: 'user' });
        }

        if (action === 'list_members') {
            const churchId = searchParams.get('church_id');
            let query = supabaseAdmin.from('profiles').select('*');

            if (churchId) {
                query = query.eq('church_id', churchId);
            }

            const { data, error } = await query.order('created_at', { ascending: false });
            if (error) throw error;
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

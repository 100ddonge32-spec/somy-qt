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
        if (action === 'check_admin' && email) {
            const { data, error } = await supabaseAdmin
                .from('app_admins')
                .select('*')
                .eq('email', email.toLowerCase().trim())
                .single();
            return NextResponse.json(data || { role: 'user' });
        }

        if (action === 'list_members') {
            const { data, error } = await supabaseAdmin
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });
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
            const { data, error } = await supabaseAdmin
                .from('profiles')
                .update(update_data)
                .eq('id', user_id)
                .select();
            if (error) throw error;
            return NextResponse.json(data);
        }

        // 개별 성도 추가
        if (action === 'add_member') {
            const { member_data } = body;
            const { data, error } = await supabaseAdmin
                .from('profiles')
                .insert([member_data])
                .select();
            if (error) throw error;
            return NextResponse.json(data);
        }

        // 개별 성도 삭제
        if (action === 'delete_member') {
            const { user_id } = body;
            const { error } = await supabaseAdmin
                .from('profiles')
                .delete()
                .eq('id', user_id);
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
            const { error } = await supabaseAdmin
                .from('profiles')
                .update({ [field]: value })
                .eq('church_id', church_id || 'jesus-in');
            if (error) throw error;
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

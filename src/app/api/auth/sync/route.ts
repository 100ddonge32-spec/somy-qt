import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
    try {
        const { user_id, email, name, avatar_url } = await req.json();

        if (!user_id) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });

        console.log(`[Sync] 프로필 확인/생성 시작: ${user_id} (${email})`);

        // 0. 관리자인지 먼저 확인 (관리자라면 자동 승인 대상)
        let isAdminMember = false;
        if (email) {
            const { data: adminCheck } = await supabaseAdmin
                .from('app_admins')
                .select('*')
                .eq('email', email.toLowerCase().trim())
                .single();
            if (adminCheck) isAdminMember = true;
        }

        // 1. 기존 프로필 확인
        const { data: existing, error: fetchError } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', user_id)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            throw fetchError;
        }

        if (!existing) {
            console.log(`[Sync] 프로필이 없어 생성합니다: ${user_id} (관리자여부: ${isAdminMember})`);
            const { error: insertError } = await supabaseAdmin
                .from('profiles')
                .insert({
                    id: user_id,
                    email: email,
                    full_name: name || '성도',
                    avatar_url: avatar_url || null,
                    church_id: 'jesus-in',
                    is_approved: isAdminMember // 관리자면 자동 승인
                });
            if (insertError) throw insertError;
            return NextResponse.json({ status: 'created', is_approved: isAdminMember });
        }

        // 관리자인데 기존 프로필이 미승인 상태면 자동 승인 업데이트
        if (isAdminMember && !existing.is_approved) {
            console.log(`[Sync] 관리자 프로필을 자동 승인으로 업데이트합니다: ${user_id}`);
            const { error: updateError } = await supabaseAdmin
                .from('profiles')
                .update({ is_approved: true })
                .eq('id', user_id);
            if (updateError) throw updateError;
            return NextResponse.json({ status: 'updated_to_approved', is_approved: true });
        }

        console.log(`[Sync] 프로필 확인 완료: ${user_id} (승인상태: ${existing.is_approved})`);
        return NextResponse.json({ status: 'exists', is_approved: existing.is_approved });

    } catch (err: any) {
        console.error('[Sync] 에러:', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

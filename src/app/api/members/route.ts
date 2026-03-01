import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query') || '';
    const churchId = searchParams.get('church_id') || '';

    try {
        let supabaseQuery = supabaseAdmin
            .from('profiles')
            .select('id, full_name, avatar_url, church_rank, member_no, gender, is_phone_public, is_birthdate_public, is_address_public, phone, birthdate, address, email, created_at, is_approved')
            .eq('church_id', churchId);

        if (query) {
            supabaseQuery = supabaseQuery.ilike('full_name', `%${query}%`);
        }

        const { data, error } = await supabaseQuery.order('full_name', { ascending: true });

        if (error) throw error;

        const isAdminQuery = searchParams.get('admin') === 'true';

        // [정석 보완] 이름이 '성도'이면서 전화번호도 없는 '유령 계정'은 제외 (관리자용 쿼리와 동일 기준)
        const activeProfiles = (data || []).filter(m => {
            const isGhost = (m.full_name === '성도' || m.full_name === '이름 없음' || m.full_name === '.') && !m.phone;
            return !isGhost || m.is_approved;
        });

        // 프라이버시 필터링
        const filteredData = activeProfiles.map(member => ({
            id: member.id,
            full_name: member.full_name,
            // [수정] 관리자 쿼리인 경우에만 이메일 포함 (보안 유지)
            email: isAdminQuery ? member.email : null,
            avatar_url: member.avatar_url,
            church_rank: member.church_rank,
            member_no: member.member_no,
            phone: (isAdminQuery || member.is_phone_public) ? member.phone : null,
            birthdate: (isAdminQuery || member.is_birthdate_public) ? member.birthdate : null,
            address: (isAdminQuery || member.is_address_public) ? member.address : null,
            gender: member.gender,
            is_phone_public: member.is_phone_public,
            is_birthdate_public: member.is_birthdate_public,
            is_address_public: member.is_address_public,
            // [추가] 관리자용 필수 필드
            created_at: isAdminQuery ? member.created_at : null,
            is_approved: member.is_approved
        }));

        return NextResponse.json(filteredData);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

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
    const churchId = searchParams.get('church_id') || 'jesus-in';

    try {
        let supabaseQuery = supabaseAdmin
            .from('profiles')
            .select('id, full_name, avatar_url, church_rank, member_no, is_phone_public, is_birthdate_public, is_address_public, phone, birthdate, address')
            .eq('church_id', churchId);

        if (query) {
            supabaseQuery = supabaseQuery.ilike('full_name', `%${query}%`);
        }

        const { data, error } = await supabaseQuery.order('full_name', { ascending: true });

        if (error) throw error;

        // 프라이버시 필터링
        const filteredData = data.map(member => ({
            id: member.id,
            full_name: member.full_name,
            avatar_url: member.avatar_url,
            church_rank: member.church_rank,
            member_no: member.member_no,
            phone: member.is_phone_public ? member.phone : null,
            birthdate: member.is_birthdate_public ? member.birthdate : null,
            address: member.is_address_public ? member.address : null,
            is_phone_public: member.is_phone_public,
            is_birthdate_public: member.is_birthdate_public,
            is_address_public: member.is_address_public
        }));

        return NextResponse.json(filteredData);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

const INVERSE_RELATIONS: Record<string, string> = {
    spouse: 'spouse',
    sibling: 'sibling',
    parent: 'child',
    child: 'parent'
};

// 1. 특정 성도의 가족 관계 조회
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get('member_id');
    const churchId = searchParams.get('church_id');

    if (!memberId || !churchId) {
        return NextResponse.json({ error: 'member_id and church_id are required' }, { status: 400 });
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('member_relationships')
            .select(`
                id,
                relationship_type,
                relative:profiles!member_relationships_relative_id_fkey (
                    id,
                    full_name,
                    avatar_url,
                    church_rank,
                    gender,
                    phone,
                    birthdate
                )
            `)
            .eq('church_id', churchId)
            .eq('member_id', memberId);

        if (error) throw error;

        return NextResponse.json(data || []);
    } catch (err: any) {
        console.error('Error fetching relationships:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// 2. 가족 관계 등록 (양방향 매핑 자동화)
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { church_id, member_id, relative_id, relationship_type } = body;

        if (!church_id || !member_id || !relative_id || !relationship_type) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (member_id === relative_id) {
            return NextResponse.json({ error: 'Cannot relate member to themselves' }, { status: 400 });
        }

        // 역관계 타입 결정
        const inverseType = INVERSE_RELATIONS[relationship_type];
        if (!inverseType) {
            return NextResponse.json({ error: 'Invalid relationship type' }, { status: 400 });
        }

        // 양방향 관계 데이터를 데이터베이스에 UPSERT 수행
        // 1) 순방향 관계
        const { error: forwardError } = await supabaseAdmin
            .from('member_relationships')
            .upsert({
                church_id,
                member_id,
                relative_id,
                relationship_type
            }, {
                onConflict: 'member_id,relative_id'
            });

        if (forwardError) throw forwardError;

        // 2) 역방향 관계
        const { error: backwardError } = await supabaseAdmin
            .from('member_relationships')
            .upsert({
                church_id,
                member_id: relative_id,
                relative_id: member_id,
                relationship_type: inverseType
            }, {
                onConflict: 'member_id,relative_id'
            });

        if (backwardError) throw backwardError;

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('Error creating relationship:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// 3. 가족 관계 삭제 (양방향 관계 동시 해제)
export async function DELETE(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get('member_id');
    const relativeId = searchParams.get('relative_id');
    const churchId = searchParams.get('church_id');

    if (!memberId || !relativeId || !churchId) {
        return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    try {
        // 1) A -> B 관계 삭제
        const { error: forwardError } = await supabaseAdmin
            .from('member_relationships')
            .delete()
            .eq('church_id', churchId)
            .eq('member_id', memberId)
            .eq('relative_id', relativeId);

        if (forwardError) throw forwardError;

        // 2) B -> A 관계 삭제
        const { error: backwardError } = await supabaseAdmin
            .from('member_relationships')
            .delete()
            .eq('church_id', churchId)
            .eq('member_id', relativeId)
            .eq('relative_id', memberId);

        if (backwardError) throw backwardError;

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('Error deleting relationship:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

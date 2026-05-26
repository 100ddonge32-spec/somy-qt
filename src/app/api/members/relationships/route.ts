import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

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

        // 역관계 타입 결정 (성별에 의존하는 관계 대응)
        let inverseType = '';
        if (relationship_type === 'spouse') {
            inverseType = 'spouse';
        } else if (relationship_type === 'sibling') {
            inverseType = 'sibling';
        } else if (relationship_type === 'father' || relationship_type === 'mother') {
            inverseType = 'child';
        } else if (relationship_type === 'grandfather' || relationship_type === 'grandmother') {
            inverseType = 'grandchild';
        } else if (relationship_type === 'child') {
            // 기준 성도(member_id)의 성별을 조회하여 아버지/어머니로 역매핑
            const { data: memberProfile } = await supabaseAdmin
                .from('profiles')
                .select('gender')
                .eq('id', member_id)
                .single();
            const gender = memberProfile?.gender;
            inverseType = gender === '여' ? 'mother' : 'father';
        } else if (relationship_type === 'grandchild') {
            // 기준 성도(member_id)의 성별을 조회하여 할아버지/할머니로 역매핑
            const { data: memberProfile } = await supabaseAdmin
                .from('profiles')
                .select('gender')
                .eq('id', member_id)
                .single();
            const gender = memberProfile?.gender;
            inverseType = gender === '여' ? 'grandmother' : 'grandfather';
        } else {
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

        // ✅ [자동화] 부모-자녀 등록 시, 배우자가 존재하면 배우자에게도 자동으로 자녀로 등록해 줍니다.
        if (relationship_type === 'father' || relationship_type === 'mother' || relationship_type === 'child') {
            await syncSpouseChildRelationships(church_id, member_id, relative_id, relationship_type);
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('Error creating relationship:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// 👨‍👩‍👧‍👦 [자동화 헬퍼] 부모-자녀 관계 등록 시 배우자 자녀 자동 매핑 연쇄 처리
async function syncSpouseChildRelationships(
    churchId: string, 
    memberId: string, 
    relativeId: string, 
    relationshipType: string
) {
    try {
        let parentId = '';
        let childId = '';

        if (relationshipType === 'father' || relationshipType === 'mother') {
            parentId = memberId;
            childId = relativeId;
        } else if (relationshipType === 'child') {
            childId = memberId;
            parentId = relativeId;
        } else {
            return;
        }

        // 1. 해당 부모(parentId)의 배우자(spouse)를 찾음
        const { data: spouseRel } = await supabaseAdmin
            .from('member_relationships')
            .select('relative_id')
            .eq('church_id', churchId)
            .eq('member_id', parentId)
            .eq('relationship_type', 'spouse')
            .maybeSingle();

        const spouseId = spouseRel?.relative_id;
        if (!spouseId) return;

        // 2. 배우자(spouseId)와 자녀(childId) 간의 기존 관계가 있는지 확인
        const { data: existing } = await supabaseAdmin
            .from('member_relationships')
            .select('id')
            .eq('church_id', churchId)
            .eq('member_id', spouseId)
            .eq('relative_id', childId)
            .maybeSingle();

        if (existing) return; // 이미 관계가 존재하면 연쇄 등록 스킵 (무한 루프 방지)

        // 3. 배우자의 성별 조회
        const { data: spouseProfile } = await supabaseAdmin
            .from('profiles')
            .select('gender')
            .eq('id', spouseId)
            .single();

        const spouseGender = spouseProfile?.gender;
        const spouseRelationType = spouseGender === '여' ? 'mother' : 'father';

        // 4. 배우자 <-> 자녀 양방향 등록
        // 1) 배우자 -> 자녀 (아버지/어머니)
        await supabaseAdmin
            .from('member_relationships')
            .upsert({
                church_id: churchId,
                member_id: spouseId,
                relative_id: childId,
                relationship_type: spouseRelationType
            }, {
                onConflict: 'member_id,relative_id'
            });

        // 2) 자녀 -> 배우자 (자녀)
        await supabaseAdmin
            .from('member_relationships')
            .upsert({
                church_id: churchId,
                member_id: childId,
                relative_id: spouseId,
                relationship_type: 'child'
            }, {
                onConflict: 'member_id,relative_id'
            });

        console.log(`[Auto-Sync] Connected Spouse ${spouseId} with Child ${childId} as ${spouseRelationType}`);
    } catch (err) {
        console.error('Error in spouse-child auto sync:', err);
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

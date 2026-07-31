import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

// 사용자별 진행 현황 및 통계 조회
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('user_id');
        const churchId = searchParams.get('church_id') || 'jesus-in';

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        // 1. 해당 교회의 전체 성경통독 목록 가져오기 (audio_url_2 유무 체크)
        const { data: readings, error: readingsError } = await supabaseAdmin
            .from('bible_readings')
            .select('id, audio_url_2')
            .eq('church_id', churchId);

        if (readingsError) throw readingsError;

        // 2. 사용자의 진행 상황 가져오기
        const { data: progressList, error: progressError } = await supabaseAdmin
            .from('bible_reading_progress')
            .select('*')
            .eq('user_id', userId)
            .eq('church_id', churchId);

        if (progressError) throw progressError;

        const totalCount = readings?.length || 0;
        const completedCount = progressList?.filter(p => {
            const reading = readings?.find(r => r.id === p.reading_id);
            const hasPart2 = !!reading?.audio_url_2;
            if (hasPart2) {
                return p.is_completed && p.is_completed_2;
            }
            return p.is_completed;
        }).length || 0;

        return NextResponse.json({
            total: totalCount,
            completed: completedCount,
            percent: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
            progressList: progressList || []
        });
    } catch (err: any) {
        console.error('[Bible Progress GET Error]:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// 사용자 진행 상황 저장/업데이트 (Upsert)
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { user_id, reading_id, church_id, is_completed, last_position, is_completed_2, last_position_2 } = body;
        const cid = church_id || 'jesus-in';

        if (!user_id || !reading_id) {
            return NextResponse.json({ error: 'User ID and Reading ID are required' }, { status: 400 });
        }

        const upsertData: any = {
            user_id,
            reading_id,
            church_id: cid,
            updated_at: new Date().toISOString()
        };

        if (last_position !== undefined) upsertData.last_position = last_position;
        if (last_position_2 !== undefined) upsertData.last_position_2 = last_position_2;

        // 파트 1 완료 상태 처리
        if (is_completed !== undefined) {
            upsertData.is_completed = is_completed;
            if (is_completed) {
                upsertData.completed_at = new Date().toISOString();
            }
        }

        // 파트 2 완료 상태 처리
        if (is_completed_2 !== undefined) {
            upsertData.is_completed_2 = is_completed_2;
        }

        const { data, error } = await supabaseAdmin
            .from('bible_reading_progress')
            .upsert(upsertData, { onConflict: 'user_id,reading_id' })
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (err: any) {
        console.error('[Bible Progress POST Error]:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

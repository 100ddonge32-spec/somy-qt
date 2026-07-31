import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

// 성경통독 회차 목록 불러오기 (교회별 격리)
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const churchId = searchParams.get('church_id') || 'jesus-in';

        const { data: readings, error } = await supabaseAdmin
            .from('bible_readings')
            .select('*')
            .eq('church_id', churchId)
            .order('id', { ascending: true }); // Day 1, Day 2 등 순차 정렬을 위해 오름차순 정렬

        if (error) throw error;
        return NextResponse.json(readings || []);
    } catch (err: any) {
        console.error('[Bible Readings GET Error]:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

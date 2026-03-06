import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 캐싱 완전 방지
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('user_id');

    if (!userId) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });

    try {
        const { data: completions, error } = await supabaseAdmin
            .from('qt_completions')
            .select('*')
            .eq('user_id', userId)
            .order('completed_date', { ascending: false });

        if (error) throw error;
        if (!completions || completions.length === 0) return NextResponse.json([]);

        // Get unique dates
        const dates = Array.from(new Set(completions.map(c => c.completed_date)));

        // Fetch corresponding daily_qt
        const { data: qts, error: qtError } = await supabaseAdmin
            .from('daily_qt')
            .select('date, reference, passage, question1, question2, question3, prayer')
            .in('date', dates);

        if (qtError) throw qtError;

        const qtMap = new Map();
        if (qts) {
            qts.forEach(qt => qtMap.set(qt.date, qt));
        }

        const data = completions.map(c => ({
            completed_date: c.completed_date,
            answers: c.answers || null,
            daily_qt: qtMap.get(c.completed_date) || null
        }));

        return NextResponse.json(data);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

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

        // Fetch community posts (reflections) for this user to match with history
        const { data: reflections, error: reflectionError } = await supabaseAdmin
            .from('community_posts')
            .select('content, created_at, is_qt')
            .eq('user_id', userId)
            .eq('is_qt', true);

        const qtMap = new Map();
        if (qts) {
            qts.forEach(qt => qtMap.set(qt.date, qt));
        }

        const reflectionMap = new Map();
        if (reflections) {
            reflections.forEach(ref => {
                // created_at (UTC) -> KST date string
                const kstDate = new Date(new Date(ref.created_at).getTime() + 9 * 60 * 60 * 1000);
                const dateStr = kstDate.toISOString().split('T')[0];
                reflectionMap.set(dateStr, ref.content);
            });
        }

        const data = completions.map(c => ({
            completed_date: c.completed_date,
            answers: c.answers || null,
            reflection: reflectionMap.get(c.completed_date) || null,
            daily_qt: qtMap.get(c.completed_date) || null
        }));

        return NextResponse.json(data);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

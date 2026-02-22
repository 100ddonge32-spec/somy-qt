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
        const { data, error } = await supabaseAdmin
            .from('qt_completions')
            .select(`
                completed_date,
                answers,
                daily_qt (
                    date,
                    reference,
                    passage,
                    question1,
                    question2,
                    question3,
                    prayer
                )
            `)
            .eq('user_id', userId)
            .order('completed_date', { ascending: false });

        if (error) throw error;
        return NextResponse.json(data);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

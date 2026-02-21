import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

function getKoreaDateString(): string {
    return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
}

// 통계 조회
export async function GET() {
    const today = getKoreaDateString();

    // 오늘 참여자
    const { data: todayList } = await supabaseAdmin
        .from('qt_completions')
        .select('user_name, avatar_url')
        .eq('completed_date', today)
        .order('created_at', { ascending: true });

    // 이번 달 랭킹 (참여 횟수 TOP 10)
    const firstOfMonth = today.slice(0, 7) + '-01';
    const { data: monthlyAll } = await supabaseAdmin
        .from('qt_completions')
        .select('user_id, user_name, avatar_url')
        .gte('completed_date', firstOfMonth)
        .lte('completed_date', today);

    // 랭킹 계산
    const countMap: Record<string, { name: string; avatar: string | null; count: number }> = {};
    (monthlyAll || []).forEach((row) => {
        if (!countMap[row.user_id]) {
            countMap[row.user_id] = { name: row.user_name, avatar: row.avatar_url, count: 0 };
        }
        countMap[row.user_id].count++;
    });

    const ranking = Object.values(countMap)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    // 전체 통계
    const { count: totalCompletions } = await supabaseAdmin
        .from('qt_completions')
        .select('*', { count: 'exact', head: true });

    return NextResponse.json({
        today: {
            count: todayList?.length || 0,
            members: todayList || [],
        },
        ranking,
        totalCompletions: totalCompletions || 0,
    });
}

// 큐티 완료 기록
export async function POST(req: NextRequest) {
    const body = await req.json();
    const { user_id, user_name, avatar_url } = body;

    if (!user_id) {
        return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 400 });
    }

    const today = getKoreaDateString();

    const { error } = await supabaseAdmin
        .from('qt_completions')
        .upsert(
            { user_id, user_name: user_name || '성도', avatar_url, completed_date: today },
            { onConflict: 'user_id,completed_date' }
        );

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 캐싱 방지: 매 요청마다 최신 데이터를 가져옴
export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

function getKoreaDateString(): string {
    return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
}

// 통계 조회 (GET)
export async function GET() {
    try {
        const today = getKoreaDateString();

        // 1. 오늘 참여자 조회
        const { data: todayList, error: todayError } = await supabaseAdmin
            .from('qt_completions')
            .select('user_name, avatar_url')
            .eq('completed_date', today)
            .order('created_at', { ascending: true });

        if (todayError) throw todayError;

        // 2. 이번 달 랭킹 조회 (참여 횟수 TOP 10)
        const firstOfMonth = today.slice(0, 7) + '-01';
        const { data: monthlyAll, error: monthlyError } = await supabaseAdmin
            .from('qt_completions')
            .select('user_id, user_name, avatar_url')
            .gte('completed_date', firstOfMonth)
            .lte('completed_date', today);

        if (monthlyError) throw monthlyError;

        // 랭킹 데이터 가공
        const countMap: Record<string, { name: string; avatar: string | null; count: number }> = {};
        (monthlyAll || []).forEach((row: any) => {
            if (!countMap[row.user_id]) {
                const name = row.user_name || '성도';
                countMap[row.user_id] = {
                    name: name.length > 10 ? name.slice(0, 10) + '...' : name,
                    avatar: row.avatar_url,
                    count: 0
                };
            }
            countMap[row.user_id].count++;
        });

        const ranking = Object.values(countMap)
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        // 3. 전체 통계 (누적 큐티 횟수)
        const { count: totalCompletions, error: countError } = await supabaseAdmin
            .from('qt_completions')
            .select('*', { count: 'exact', head: true });

        if (countError) throw countError;

        return NextResponse.json({
            today: {
                count: todayList?.length || 0,
                members: todayList || [],
            },
            ranking,
            totalCompletions: totalCompletions || 0,
        });
    } catch (err: any) {
        console.error('Stats GET Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// 큐티 완료 기록 (POST)
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { user_id, user_name, avatar_url } = body;

        if (!user_id) {
            return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 400 });
        }

        const today = getKoreaDateString();

        // 중복 방지(upsert): 같은 날 한 명이 여러 번 눌러도 한 번만 기록됨
        const { error } = await supabaseAdmin
            .from('qt_completions')
            .upsert(
                { user_id, user_name: user_name || '성도', avatar_url, completed_date: today },
                { onConflict: 'user_id,completed_date' }
            );

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('Stats POST Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

// 관리자 검증 헬퍼 함수
async function checkIsAdmin(userId: string, churchId: string): Promise<boolean> {
    try {
        const HARDCODED_ADMINS = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "pastorbaek@kakao.com,kakao_4761026797@kakao.somy-qt.local").toLowerCase().split(',').map(e => e.trim());
        const { data: profile } = await supabaseAdmin.from('profiles').select('email, full_name').eq('id', userId).maybeSingle();
        const userEmail = profile?.email?.toLowerCase().trim() || "";
        
        const isMaster = HARDCODED_ADMINS.includes(userEmail) || 
                         (profile?.full_name === '백동희' || profile?.full_name === '동희');
        
        if (isMaster) return true;

        let adminQuery = supabaseAdmin.from('app_admins').select('*');
        if (userEmail && userEmail !== 'undefined' && userEmail !== 'null') {
            adminQuery = adminQuery.or(`user_id.eq.${userId},email.eq.${userEmail}`);
        } else {
            adminQuery = adminQuery.eq('user_id', userId);
        }

        const { data: admin } = await adminQuery.maybeSingle();
        if (!admin) return false;

        if (admin.role === 'super_admin') return true;
        
        const normalize = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]/gi, '_');
        return normalize(admin.church_id) === normalize(churchId);
    } catch (e) {
        console.error('[checkIsAdmin Error]:', e);
        return false;
    }
}

// 성경통독 회차 목록 불러오기 (교회별 격리)
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const churchId = searchParams.get('church_id') || 'jesus-in';
        const userId = searchParams.get('user_id');

        let isAdmin = false;
        if (userId) {
            isAdmin = await checkIsAdmin(userId, churchId);
        }

        let dbQuery = supabaseAdmin
            .from('bible_readings')
            .select('*')
            .eq('church_id', churchId);

        if (!isAdmin) {
            const nowIso = new Date().toISOString();
            dbQuery = dbQuery.lte('published_at', nowIso);
        }

        const { data: readings, error } = await dbQuery.order('id', { ascending: true }); // Day 1, Day 2 등 순차 정렬을 위해 오름차순 정렬

        if (error) throw error;
        return NextResponse.json(readings || []);
    } catch (err: any) {
        console.error('[Bible Readings GET Error]:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

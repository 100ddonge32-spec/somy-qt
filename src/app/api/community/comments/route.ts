import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

// 댓글 작성
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { post_id, user_id, user_name, content } = body;

        const { data, error } = await supabaseAdmin
            .from('community_comments')
            .insert([{ post_id, user_id, user_name, content }])
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

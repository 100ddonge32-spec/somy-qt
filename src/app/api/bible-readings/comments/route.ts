import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

// 특정 성경통독 회차의 댓글 리스트 조회
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const readingId = searchParams.get('reading_id');

        if (!readingId) {
            return NextResponse.json({ error: 'Reading ID is required' }, { status: 400 });
        }

        const { data: comments, error } = await supabaseAdmin
            .from('bible_reading_comments')
            .select(`
                *,
                profiles:user_id (
                    avatar_url
                )
            `)
            .eq('reading_id', readingId)
            .order('created_at', { ascending: true }); // 은혜 나눔 흐름을 위해 시간 등록 순서대로 노출

        if (error) throw error;
        return NextResponse.json(comments || []);
    } catch (err: any) {
        console.error('[Bible Comments GET Error]:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// 은혜 나눔 댓글 등록 및 완료 인증 여부 저장
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { reading_id, user_id, user_name, content, is_completed_comment } = body;

        if (!reading_id || !user_id || !content) {
            return NextResponse.json({ error: 'Reading ID, User ID and Content are required' }, { status: 400 });
        }

        // [이름 보정] user_name이 비었거나 형식 오류일 경우 profiles에서 복구
        let finalUserName = user_name;
        if (!finalUserName || /^[0-9]+$/.test(String(finalUserName))) {
            const { data: profile } = await supabaseAdmin
                .from('profiles')
                .select('full_name')
                .eq('id', user_id)
                .single();
            if (profile?.full_name) {
                finalUserName = profile.full_name;
            } else {
                finalUserName = '성도';
            }
        }

        const { data: comment, error } = await supabaseAdmin
            .from('bible_reading_comments')
            .insert([{
                reading_id,
                user_id,
                user_name: finalUserName,
                content,
                is_completed_comment: is_completed_comment || false
            }])
            .select()
            .single();

        if (error) throw error;

        // 사용자가 "통독 완료"로 남겼다면 progress 테이블에도 자동 반영 (Upsert)
        if (is_completed_comment) {
            // 해당 통독의 church_id 및 audio_url_2 존재 여부 확인
            const { data: reading } = await supabaseAdmin
                .from('bible_readings')
                .select('church_id, audio_url_2')
                .eq('id', reading_id)
                .single();

            const churchId = reading?.church_id || 'jesus-in';
            const hasPart2 = !!reading?.audio_url_2;

            const upsertPayload: any = {
                user_id,
                reading_id,
                church_id: churchId,
                is_completed: true,
                completed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            if (hasPart2) {
                upsertPayload.is_completed_2 = true;
            }

            await supabaseAdmin.from('bible_reading_progress').upsert(upsertPayload, { onConflict: 'user_id,reading_id' });
        }

        return NextResponse.json(comment);
    } catch (err: any) {
        console.error('[Bible Comments POST Error]:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// 댓글 삭제
export async function DELETE(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, user_id, is_admin } = body;

        if (!id) {
            return NextResponse.json({ error: 'Comment ID is required' }, { status: 400 });
        }

        // 권한 확인: 본인 글이거나 관리자일 때만 삭제 허용
        if (!is_admin && user_id) {
            const { data: existing } = await supabaseAdmin
                .from('bible_reading_comments')
                .select('user_id')
                .eq('id', id)
                .single();

            if (existing && existing.user_id !== user_id) {
                return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
            }
        }

        const { error } = await supabaseAdmin
            .from('bible_reading_comments')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[Bible Comments DELETE Error]:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

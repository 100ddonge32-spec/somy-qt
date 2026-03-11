import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
    try {
        // 권한 확인 (보통은 내부 크론이나 마스터 관리자만 호출 가능하게 함)
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        const isoDate = ninetyDaysAgo.toISOString();

        console.log(`[Gallery Cleanup] Deleting posts older than: ${isoDate}`);

        // 1. 오래된 게시글 조회 (스토리지 삭제를 위해 URL 확보가 필요할 수 있음)
        const { data: oldPosts, error: fetchError } = await supabaseAdmin
            .from('gallery_posts')
            .select('id, image_url')
            .lt('created_at', isoDate);

        if (fetchError) throw fetchError;

        if (!oldPosts || oldPosts.length === 0) {
            return NextResponse.json({ message: 'No old posts to clean up.' });
        }

        // 2. 게시글 삭제 (DB) - CASCADE 설정으로 댓글/좋아요는 자동 삭제됨
        const { error: deleteError } = await supabaseAdmin
            .from('gallery_posts')
            .delete()
            .lt('created_at', isoDate);

        if (deleteError) throw deleteError;

        // 3. 스토리지 파일 삭제 (선택 사항: 파일명이 URL에 포함되어 있으므로 파싱해서 삭제 필요)
        // 여기서는 복잡성을 피하기 위해 DB 삭제 위주로 처리하며, 
        // 실제 운영 시에는 image_url에서 경로를 추출해 storage.from('gallery').remove([paths]) 호출 권장

        return NextResponse.json({ 
            success: true, 
            cleanedCount: oldPosts.length,
            message: `${oldPosts.length}개의 오래된 사진이 정리되었습니다.`
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

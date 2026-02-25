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
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const churchId = formData.get('church_id') as string;

        if (!file || !churchId) {
            return NextResponse.json({ error: 'Missing file or church_id' }, { status: 400 });
        }

        const fileExt = file.name.split('.').pop();
        // 한글이나 특수문자가 섞인 churchId를 안전한 파일명으로 변환
        const safeId = churchId.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const fileName = `${safeId}-book-${Date.now()}.${fileExt}`;
        const filePath = `books/${fileName}`; // 책 이미지는 books 폴더에 관리

        console.log(`[Upload API] Attempting upload: bucket=church-assets, path=${filePath}`);

        // 버킷이 없으면 생성 시도
        await supabaseAdmin.storage.createBucket('church-assets', { public: true }).catch(() => { });

        // 파일 업로드
        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
            .from('church-assets')
            .upload(filePath, file, {
                contentType: file.type,
                upsert: true
            });

        if (uploadError) {
            console.error('[Upload API] Supabase Upload Error:', uploadError);
            throw uploadError;
        }

        // 공개 URL 가져오기
        const { data: { publicUrl } } = supabaseAdmin.storage
            .from('church-assets')
            .getPublicUrl(filePath);

        console.log(`[Upload API] Success! Public URL: ${publicUrl}`);

        return NextResponse.json({ url: publicUrl });
    } catch (err: any) {
        console.error('Logo upload error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

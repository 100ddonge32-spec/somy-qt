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
        console.log('[Upload API] Received POST request');
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const churchId = formData.get('church_id') as string;
        const type = (formData.get('type') as string) || 'asset';

        if (!file) {
            console.error('[Upload API] No file found in request');
            return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 });
        }
        if (!churchId) {
            console.error('[Upload API] No churchId found in request');
            return NextResponse.json({ error: 'church_id가 없습니다.' }, { status: 400 });
        }

        console.log(`[Upload API] Processing: churchId=${churchId}, type=${type}, filename=${file.name}, size=${file.size}`);

        const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
        const safeId = churchId.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        
        let folder = 'assets';
        if (type === 'logo') folder = 'logos';
        else if (type === 'poster') folder = 'posters';
        else if (type === 'book') folder = 'books';

        const fileName = `${safeId}-${type}-${Date.now()}.${fileExt}`;
        const filePath = `${folder}/${fileName}`;

        console.log(`[Upload API] Uploading to bucket: church-assets, path: ${filePath}`);

        // 버킷이 없으면 생성 시도
        try {
            await supabaseAdmin.storage.createBucket('church-assets', { public: true });
            console.log('[Upload API] Bucket church-assets created or already exists');
        } catch (bucketErr) {
            // 이미 존재하면 에러가 날 수 있음
        }

        // 파일 업로드
        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
            .from('church-assets')
            .upload(filePath, file, {
                contentType: file.type,
                cacheControl: '31536000', // 1년 캐싱 기한 설정
                upsert: true
            });

        if (uploadError) {
            console.error('[Upload API] Supabase Storage Error:', uploadError);
            return NextResponse.json({ error: `저장소 오류: ${uploadError.message}` }, { status: 500 });
        }

        // 공개 URL 가져오기
        const { data: { publicUrl } } = supabaseAdmin.storage
            .from('church-assets')
            .getPublicUrl(filePath);

        console.log(`[Upload API] Upload successful. Public URL: ${publicUrl}`);

        return NextResponse.json({ url: publicUrl });
    } catch (err: any) {
        console.error('[Upload API] Internal Server Error:', err);
        return NextResponse.json({ error: `서버 오류: ${err.message}` }, { status: 500 });
    }
}

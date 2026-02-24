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
        const userId = formData.get('user_id') as string;

        if (!file || !userId) {
            return NextResponse.json({ error: 'Missing file or user_id' }, { status: 400 });
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        // 버킷이 없으면 생성 시도 (이미 있으면 에러가 나겠지만 무시)
        await supabaseAdmin.storage.createBucket('member-photos', { public: true }).catch(() => { });

        // 파일 업로드
        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
            .from('member-photos')
            .upload(filePath, file, {
                contentType: file.type,
                upsert: true
            });

        if (uploadError) throw uploadError;

        // 공개 URL 가져오기
        const { data: { publicUrl } } = supabaseAdmin.storage
            .from('member-photos')
            .getPublicUrl(filePath);

        // 프로필 업데이트
        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({ avatar_url: publicUrl })
            .eq('id', userId);

        if (updateError) throw updateError;

        return NextResponse.json({ url: publicUrl });
    } catch (err: any) {
        console.error('Upload error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

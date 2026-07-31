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
        
        // 마스터 권한 확인 (이메일 및 성함)
        const isMaster = HARDCODED_ADMINS.includes(userEmail) || 
                         (profile?.full_name === '백동희' || profile?.full_name === '동희');
        
        if (isMaster) return true;

        // 개별 교회 관리자 확인
        let adminQuery = supabaseAdmin.from('app_admins').select('*');
        if (userEmail && userEmail !== 'undefined' && userEmail !== 'null') {
            adminQuery = adminQuery.or(`user_id.eq.${userId},email.eq.${userEmail}`);
        } else {
            adminQuery = adminQuery.eq('user_id', userId);
        }

        const { data: admin } = await adminQuery.maybeSingle();
        if (!admin) return false;

        // 슈퍼 어드민이거나 소속 일치 여부 확인
        if (admin.role === 'super_admin') return true;
        
        const normalize = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]/gi, '_');
        return normalize(admin.church_id) === normalize(churchId);
    } catch (e) {
        console.error('[checkIsAdmin Error]:', e);
        return false;
    }
}

// 1. 신규 성경통독 회차 등록 (오디오 파일 업로드 + 이미지 업로드 + DB 기록)
export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const imageFile = formData.get('image') as File | null;
        const title = formData.get('title') as string;
        const description = formData.get('description') as string;
        const churchId = formData.get('church_id') as string;
        const userId = formData.get('user_id') as string;

        if (!file) return NextResponse.json({ error: '오디오 파일이 없습니다.' }, { status: 400 });
        if (!title) return NextResponse.json({ error: '제목을 입력해주세요.' }, { status: 400 });
        if (!churchId || !userId) return NextResponse.json({ error: '필수 매개변수(church_id, user_id)가 없습니다.' }, { status: 400 });

        // 관리자 권한 체크
        const isAdmin = await checkIsAdmin(userId, churchId);
        if (!isAdmin) {
            return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
        }

        const safeChurchId = churchId.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        
        // 버킷이 없을 경우 생성 시도
        try {
            await supabaseAdmin.storage.createBucket('church-assets', { public: true });
        } catch (bucketErr) {
            // 이미 존재할 시 통과
        }

        // 1. 오디오 파일 업로드
        const fileExt = file.name.split('.').pop()?.toLowerCase() || 'mp3';
        const audioFileName = `${safeChurchId}-bible-${Date.now()}.${fileExt}`;
        const audioFilePath = `bible-readings/${audioFileName}`;

        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
            .from('church-assets')
            .upload(audioFilePath, file, {
                contentType: 'audio/mpeg',
                cacheControl: '31536000',
                upsert: true
            });

        if (uploadError) {
            console.error('[Storage Upload Error]:', uploadError);
            return NextResponse.json({ error: `오디오 업로드 실패: ${uploadError.message}` }, { status: 500 });
        }

        // 오디오 파일의 Public URL 취득
        const { data: { publicUrl: audioPublicUrl } } = supabaseAdmin.storage
            .from('church-assets')
            .getPublicUrl(audioFilePath);

        // 2. 이미지 파일 업로드 (선택 사항)
        let imagePublicUrl = null;
        let imageFilePath = null;
        if (imageFile && imageFile.size > 0) {
            const imgExt = imageFile.name.split('.').pop()?.toLowerCase() || 'png';
            const imgFileName = `${safeChurchId}-bible-img-${Date.now()}.${imgExt}`;
            imageFilePath = `bible-readings/${imgFileName}`;

            const { data: imgUploadData, error: imgUploadError } = await supabaseAdmin.storage
                .from('church-assets')
                .upload(imageFilePath, imageFile, {
                    contentType: imageFile.type,
                    cacheControl: '31536000',
                    upsert: true
                });

            if (imgUploadError) {
                console.error('[Storage Image Upload Error]:', imgUploadError);
                // 오디오가 이미 성공한 상태이므로 롤백해줌
                await supabaseAdmin.storage.from('church-assets').remove([audioFilePath]);
                return NextResponse.json({ error: `이미지 업로드 실패: ${imgUploadError.message}` }, { status: 500 });
            }

            const { data: { publicUrl: imgUrl } } = supabaseAdmin.storage
                .from('church-assets')
                .getPublicUrl(imageFilePath);
            
            imagePublicUrl = imgUrl;
        }

        // 3. bible_readings 테이블에 메타데이터 저장
        const { data: reading, error: insertError } = await supabaseAdmin
            .from('bible_readings')
            .insert([{
                church_id: churchId,
                title,
                audio_url: audioPublicUrl,
                image_url: imagePublicUrl,
                description: description || ''
            }])
            .select()
            .single();

        if (insertError) {
            // 실패 시 업로드한 오디오 및 이미지 파일 지우기
            await supabaseAdmin.storage.from('church-assets').remove([audioFilePath]);
            if (imageFilePath) {
                await supabaseAdmin.storage.from('church-assets').remove([imageFilePath]);
            }
            throw insertError;
        }

        return NextResponse.json(reading);
    } catch (err: any) {
        console.error('[Bible Readings Admin POST Error]:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// 2. 성경통독 회차 삭제 (DB 및 스토리지 파일 전체 삭제)
export async function DELETE(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, user_id, church_id } = body;

        if (!id || !user_id || !church_id) {
            return NextResponse.json({ error: '필수 정보(id, user_id, church_id)가 없습니다.' }, { status: 400 });
        }

        // 관리자 권한 체크
        const isAdmin = await checkIsAdmin(user_id, church_id);
        if (!isAdmin) {
            return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
        }

        // 1. 해당 회차의 데이터 조회하여 파일 경로 찾기
        const { data: reading, error: selectError } = await supabaseAdmin
            .from('bible_readings')
            .select('audio_url, image_url')
            .eq('id', id)
            .single();

        if (selectError) throw selectError;
        if (!reading) return NextResponse.json({ error: '존재하지 않는 통독 데이터입니다.' }, { status: 404 });

        // 2. Storage 오디오 파일 삭제
        try {
            const audioUrl = reading.audio_url;
            if (audioUrl && audioUrl.includes('/storage/v1/object/public/church-assets/')) {
                const pathParts = audioUrl.split('/storage/v1/object/public/church-assets/');
                if (pathParts.length > 1) {
                    const filePath = decodeURIComponent(pathParts[1]);
                    await supabaseAdmin.storage.from('church-assets').remove([filePath]);
                    console.log(`[Storage Deleted Audio]: ${filePath}`);
                }
            }
        } catch (storageDelErr) {
            console.error('[Storage Audio Delete Warning]:', storageDelErr);
        }

        // 3. Storage 이미지 파일 삭제 (존재하는 경우)
        try {
            const imageUrl = reading.image_url;
            if (imageUrl && imageUrl.includes('/storage/v1/object/public/church-assets/')) {
                const pathParts = imageUrl.split('/storage/v1/object/public/church-assets/');
                if (pathParts.length > 1) {
                    const filePath = decodeURIComponent(pathParts[1]);
                    await supabaseAdmin.storage.from('church-assets').remove([filePath]);
                    console.log(`[Storage Deleted Image]: ${filePath}`);
                }
            }
        } catch (storageDelErr) {
            console.error('[Storage Image Delete Warning]:', storageDelErr);
        }

        // 4. DB에서 삭제 (진행율 및 댓글 테이블은 FOREIGN KEY ON DELETE CASCADE 제약 조건으로 자동 삭제됨)
        const { error: deleteError } = await supabaseAdmin
            .from('bible_readings')
            .delete()
            .eq('id', id);

        if (deleteError) throw deleteError;

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[Bible Readings Admin DELETE Error]:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

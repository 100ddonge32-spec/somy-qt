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

// 1. 신규 성경통독 회차 등록 (오디오 파일 최대 2개 업로드 + 이미지 업로드 + DB 기록)
// 1. 신규 성경통독 회차 등록 (클라이언트에서 직접 업로드 완료된 URL들을 받아 DB에 메타데이터 저장)
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { title, description, audio_url, audio_url_2, image_url, church_id, user_id } = body;

        if (!audio_url) return NextResponse.json({ error: '첫 번째 오디오 파일 URL이 없습니다.' }, { status: 400 });
        if (!title) return NextResponse.json({ error: '제목을 입력해주세요.' }, { status: 400 });
        if (!church_id || !user_id) return NextResponse.json({ error: '필수 매개변수(church_id, user_id)가 없습니다.' }, { status: 400 });

        // 관리자 권한 체크
        const isAdmin = await checkIsAdmin(user_id, church_id);
        if (!isAdmin) {
            return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
        }

        // bible_readings 테이블에 메타데이터 저장
        const { data: reading, error: insertError } = await supabaseAdmin
            .from('bible_readings')
            .insert([{
                church_id,
                title,
                audio_url,
                audio_url_2,
                image_url,
                description: description || ''
            }])
            .select()
            .single();

        if (insertError) throw insertError;

        return NextResponse.json(reading);
    } catch (err: any) {
        console.error('[Bible Readings Admin POST Error]:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// 스토리지에서 파일 제거 헬퍼 함수 (단일 URL 및 JSON 형식의 이미지 리스트 모두 대응)
async function deleteFileFromStorage(urlOrJson: string | null | undefined) {
    if (!urlOrJson) return;
    let urls: string[] = [];
    if (urlOrJson.startsWith('[') && urlOrJson.endsWith(']')) {
        try {
            urls = JSON.parse(urlOrJson);
        } catch (e) {
            urls = [urlOrJson];
        }
    } else {
        urls = [urlOrJson];
    }

    const filePathsToDelete: string[] = [];
    for (const url of urls) {
        if (url && url.includes('/storage/v1/object/public/church-assets/')) {
            const pathParts = url.split('/storage/v1/object/public/church-assets/');
            if (pathParts.length > 1) {
                const filePath = decodeURIComponent(pathParts[1]);
                filePathsToDelete.push(filePath);
            }
        }
    }

    if (filePathsToDelete.length > 0) {
        try {
            const { error } = await supabaseAdmin.storage.from('church-assets').remove(filePathsToDelete);
            if (error) {
                console.error('[Storage Delete Error]:', error);
            } else {
                console.log(`[Storage Deleted Files]:`, filePathsToDelete);
            }
        } catch (e) {
            console.error('[Storage Delete Catch Error]:', e);
        }
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
            .select('audio_url, audio_url_2, image_url')
            .eq('id', id)
            .single();

        if (selectError) throw selectError;
        if (!reading) return NextResponse.json({ error: '존재하지 않는 통독 데이터입니다.' }, { status: 404 });

        // 2. Storage 오디오 파일 1 삭제
        try {
            await deleteFileFromStorage(reading.audio_url);
        } catch (storageDelErr) {
            console.error('[Storage Audio 1 Delete Warning]:', storageDelErr);
        }

        // 3. Storage 오디오 파일 2 삭제
        try {
            await deleteFileFromStorage(reading.audio_url_2);
        } catch (storageDelErr) {
            console.error('[Storage Audio 2 Delete Warning]:', storageDelErr);
        }

        // 4. Storage 이미지 파일 삭제 (존재하는 경우)
        try {
            await deleteFileFromStorage(reading.image_url);
        } catch (storageDelErr) {
            console.error('[Storage Image Delete Warning]:', storageDelErr);
        }

        // 5. DB에서 삭제 (진행율 및 댓글 테이블은 FOREIGN KEY ON DELETE CASCADE 제약 조건으로 자동 삭제됨)
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

// 3. 성경통독 회차 정보 수정 (가벼운 JSON 요청 수신 + 기존 리소스 변경 감지 시 클린 삭제)
export async function PUT(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, title, description, audio_url, audio_url_2, image_url, church_id, user_id } = body;

        if (!id) return NextResponse.json({ error: '회차 ID가 필요합니다.' }, { status: 400 });
        if (!title) return NextResponse.json({ error: '제목을 입력해주세요.' }, { status: 400 });
        if (!church_id || !user_id) return NextResponse.json({ error: '필수 매개변수(church_id, user_id)가 없습니다.' }, { status: 400 });

        // 관리자 권한 체크
        const isAdmin = await checkIsAdmin(user_id, church_id);
        if (!isAdmin) {
            return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
        }

        // 1. 기존 데이터 조회하여 파일 변경 여부 확인
        const { data: oldReading, error: fetchError } = await supabaseAdmin
            .from('bible_readings')
            .select('audio_url, audio_url_2, image_url')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;
        if (!oldReading) return NextResponse.json({ error: '수정하려는 데이터를 찾을 수 없습니다.' }, { status: 404 });

        // 2. 변경된 파일이 존재하거나 기존 파일이 제거되었을 시 스토리지 파일 삭제 처리
        if (audio_url && oldReading.audio_url && audio_url !== oldReading.audio_url) {
            await deleteFileFromStorage(oldReading.audio_url);
        }
        if (oldReading.audio_url_2 && audio_url_2 !== oldReading.audio_url_2) {
            await deleteFileFromStorage(oldReading.audio_url_2);
        }
        
        // 이미지 개별 제거 비교
        if (oldReading.image_url) {
            const parseUrls = (val: string | null | undefined) => {
                if (!val) return [];
                if (val.startsWith('[') && val.endsWith(']')) {
                    try { return JSON.parse(val); } catch(e) {}
                }
                return [val];
            };
            const oldUrls: string[] = parseUrls(oldReading.image_url);
            const newUrls: string[] = parseUrls(image_url);
            
            // oldUrls에는 존재하지만 newUrls에는 존재하지 않는 URL들만 삭제
            const removedUrls = oldUrls.filter(url => !newUrls.includes(url));
            for (const url of removedUrls) {
                await deleteFileFromStorage(url);
            }
        }

        // 3. DB 업데이트 수행
        const { data: reading, error: updateError } = await supabaseAdmin
            .from('bible_readings')
            .update({
                title,
                description: description || '',
                audio_url: audio_url,
                audio_url_2: audio_url_2, // null도 가능
                image_url: image_url // null도 가능
            })
            .eq('id', id)
            .select()
            .single();

        if (updateError) throw updateError;

        return NextResponse.json(reading);
    } catch (err: any) {
        console.error('[Bible Readings Admin PUT Error]:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}


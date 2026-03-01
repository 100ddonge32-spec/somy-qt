import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        return NextResponse.json({ error: 'Supabase 설정(URL 또는 Service Role Key)이 서버 환경변수에 누락되었습니다.' }, { status: 500 });
    }

    try {
        const { name, phoneTail, birthdate, user_id, church_id } = await req.json();

        if (!name || !phoneTail || !user_id) {
            return NextResponse.json({ error: '필수 정보가 누락되었습니다.' }, { status: 400 });
        }

        console.log(`[DirectAuth] Login Try - Name: ${name}, PhoneTail: ${phoneTail}, Birthdate: ${birthdate}, Church: ${church_id}`);

        // 1. 이름으로 먼저 후보군 찾기 (이름은 공백을 포함할 수 있으므로 앞뒤 공백만 제거)
        const inputNameClean = name.replace(/\s+/g, '').toLowerCase();

        // DB 단에서 이름으로 필터링 (완전 일치 또는 포함)
        const { data: nameMatches, error: fetchError } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .or(`full_name.ilike.%${name.trim()}%,full_name.ilike.%${inputNameClean}%`);

        if (fetchError) throw fetchError;

        console.log(`[DirectAuth] Name matches count: ${nameMatches?.length}`);

        const match = nameMatches?.find(c => {
            // 정밀 이름 비교 (공백 제거)
            const dbName = (c.full_name || '').replace(/\s+/g, '').toLowerCase();
            const inputName = name.replace(/\s+/g, '').toLowerCase();

            // 전화번호 비교 (전체 번호 또는 뒷자리)
            const dbPhone = (c.phone || '').replace(/[^0-9]/g, '');
            const inputPhone = (phoneTail || '').replace(/[^0-9]/g, '');

            // 생년월일 비교
            const dbBirth = (c.birthdate || '').replace(/[^0-9]/g, '');
            const inputBirth = (birthdate || '').replace(/[^0-9]/g, '');

            const isNameMatch = dbName === inputName;

            // 전화번호 매칭: 입력된 번호가 DB 번호와 정확히 같거나, 입력된 번호가 DB 번호의 뒷자리인 경우
            let isPhoneMatch = false;
            if (dbPhone && inputPhone) {
                isPhoneMatch = dbPhone === inputPhone || dbPhone.endsWith(inputPhone);
            }

            // 1순위: 이름과 전화번호가 모두 일치 (가장 정확)
            if (isNameMatch && isPhoneMatch) {
                // 생년월일 정보도 있다면 그것까지 확인
                if (inputBirth && dbBirth) {
                    return dbBirth.endsWith(inputBirth) || inputBirth.endsWith(dbBirth);
                }
                return true;
            }

            // 2순위: 이름이 정확히 일치하고, 생년월일이 일치하는 경우
            if (isNameMatch && inputBirth && dbBirth && (dbBirth.endsWith(inputBirth) || inputBirth.endsWith(dbBirth))) {
                return true;
            }

            return false;
        });

        if (match) {
            console.log(`[DirectAuth] Match Found: ${match.full_name} (${match.id})`);

            // [개선] 기기/ID 변경 감지 및 관리자 검토 플래그
            const isNewDevice = match.id !== user_id;
            const now = new Date().toISOString();

            // 매칭된 경우: 익명 user_id를 이 프로필에 연결 및 즉시 승인
            // last_login_at을 기록하고 기기 변경이 감지되면 메모 필드 등에 남김 (감사항목)
            const { error: upsertError } = await supabaseAdmin.from('profiles').upsert({
                ...match,
                id: user_id,
                email: match.email || `${user_id}@anonymous.local`,
                is_approved: true, // 매칭 성공 시 즉시 사용 가능하도록 자동 승인
                last_login_at: now
                // [수정] is_new_login 컬럼은 DB에 없을 수 있으므로 제거 (필요 시 DB 추가 후 사용)
            });

            if (upsertError) {
                console.error(`[DirectAuth] Profile linkage failed for ${match.full_name}:`, upsertError);
                throw new Error('프로필 연결 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
            }

            if (isNewDevice) {
                // 관리자 권한 이전 로직 (기존 프로필 삭제 전 수행)
                const oldSurrogateEmail = `${match.id}@anonymous.local`;
                const realEmail = match.email && !match.email.includes('anonymous.local') ? match.email : null;
                const newSurrogateEmail = `${user_id}@anonymous.local`;
                const targetEmail = realEmail || newSurrogateEmail;

                // 1. 기존 권한 조회 (ID 기반 또는 기존 저장된 이메일 기반)
                const { data: adminEntries } = await supabaseAdmin.from('app_admins')
                    .select('*')
                    .or(`user_id.eq.${match.id},email.eq.${match.id},email.eq.${oldSurrogateEmail}${realEmail ? `,email.eq.${realEmail.toLowerCase().trim()}` : ''}`);

                if (adminEntries && adminEntries.length > 0) {
                    console.log(`[Admin Migration] Moving rights for ${match.full_name} to new ID: ${user_id}`);
                    for (const entry of adminEntries) {
                        // 새 계정으로 권한 복사/업데이트
                        await supabaseAdmin.from('app_admins').upsert({
                            ...entry,
                            email: targetEmail.toLowerCase().trim(),
                            user_id: user_id // 새 세션 ID로 업데이트
                        }, { onConflict: 'email' });

                        // 만약 이메일이 변경되었다면(즉, 기존 이메일이 surrogate였던 경우) 이전 이메일은 삭제
                        if (entry.email.toLowerCase().trim() !== targetEmail.toLowerCase().trim()) {
                            await supabaseAdmin.from('app_admins').delete().eq('email', entry.email);
                        }
                    }
                }

                // [중요] 기존 기기(ID) 정보 삭제 (데이터 클립업)
                // UPSERT가 성공한 후에만 삭제가 수행되도록 보장됨
                await supabaseAdmin.from('profiles').delete().eq('id', match.id);
            }


            return NextResponse.json({
                success: true,
                status: 'linked',
                name: match.full_name,
                church_id: match.church_id || 'jesus-in'
            });
        } else {
            // [추가] '성도', '사용자' 처럼 너무 일반적인 이름은 입력을 막음
            const genericNames = ['성도', '이름 없음', '이름미입력', '사용자', '큐티', 'somy', '.', ''];
            if (genericNames.includes(name.trim())) {
                return NextResponse.json({ error: '정확한 성함을 입력해 주세요.' }, { status: 400 });
            }

            // 매칭 정보가 없을 경우, 일단 신규 가입으로 간주하고 자동 승인 처리합니다. (관리자 요청)
            await supabaseAdmin.from('profiles').upsert({
                id: user_id,
                full_name: name,
                phone: phoneTail.length > 4 ? phoneTail : `(미인증)${phoneTail}`,
                birthdate: birthdate || null,
                is_approved: true, // [변경] 자동 승인
                church_id: church_id || 'jesus-in',
                email: `${user_id}@anonymous.local`
            });

            return NextResponse.json({
                success: true,
                status: 'pending',
                name: name,
                church_id: church_id || 'jesus-in',
                message: '성도 명단에서 정보를 찾을 수 없어 원활한 서비스 이용을 위해 임시 승인되었습니다.'
            });
        }


    } catch (err: any) {
        console.error('[DirectAuth Error]', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

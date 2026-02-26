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
        const { name, phoneTail, birthdate, user_id } = await req.json();

        if (!name || !phoneTail || !user_id) {
            return NextResponse.json({ error: '필수 정보가 누락되었습니다.' }, { status: 400 });
        }

        console.log(`[DirectAuth] Login Try - Name: ${name}, PhoneTail: ${phoneTail}, Birthdate: ${birthdate}`);

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

            // 전화번호 비교
            const dbPhone = (c.phone || '').replace(/[^0-9]/g, '');
            const inputPhoneTail = (phoneTail || '').replace(/[^0-9]/g, '');

            // 생년월일 비교
            const dbBirth = (c.birthdate || '').replace(/[^0-9]/g, '');
            const inputBirth = (birthdate || '').replace(/[^0-9]/g, '');

            const isNameMatch = dbName === inputName;
            // 전화번호가 있는 경우에만 뒷자리 비교
            const isPhoneMatch = dbPhone && inputPhoneTail ? dbPhone.endsWith(inputPhoneTail) : false;

            // 1순위: 이름과 전화번호 뒷자리가 모두 일치
            if (isNameMatch && isPhoneMatch) {
                // 생년월일 정보도 있다면 그것까지 확인 (더 정확한 매칭)
                if (inputBirth && dbBirth) {
                    return dbBirth.endsWith(inputBirth) || inputBirth.endsWith(dbBirth);
                }
                return true;
            }

            // 2순위: 이름이 정확히 일치하고, 생년월일이 일치하는 경우 (전화번호가 DB에 없을 수 있음)
            if (isNameMatch && inputBirth && dbBirth && (dbBirth.endsWith(inputBirth) || inputBirth.endsWith(dbBirth))) {
                return true;
            }

            return false;
        });

        if (match) {
            console.log(`[DirectAuth] Match Found: ${match.full_name} (${match.id})`);

            // 매칭된 경우: 익명 user_id를 이 프로필에 연결
            // 만약 이미 다른 user_id가 연결되어 있다면? 
            // - 어드민 업로드 데이터(가상 이메일)인 경우 그냥 덮어씌움
            // - 이미 정식 user_id가 있는 경우 (id가 UUID 형태) -> 이것도 그냥 현재 익명 ID로 덮어씌우거나 통합

            const updateFields = {
                id: user_id, // 익명 로그인 ID로 변경
                is_approved: true,
                // 기존 데이터 유지
                avatar_url: match.avatar_url,
                email: match.email || `${user_id}@anonymous.local`
            };

            // 기존 match 행의 ID를 현재 익명 ID로 업데이트 (ID 자체를 업데이트하는 것은 PK 이슈가 있을 수 있으므로 필드 업데이트)
            // Supabase에서 PK인 ID를 바꾸는건 복잡할 수 있으니, 
            // 'profiles' 테이블의 id는 그대로 두고 다른 컬럼을 써야할지? 
            // 아니면 현재 profileById 행을 만들고 match 데이터를 복사하고 match 행을 삭제할지? (이미 sync API에서 쓰던 방식)

            // Sync API 방식: 새 행(user_id) 생성 후 데이터 복사, 기존 행 삭제
            await supabaseAdmin.from('profiles').upsert({
                ...match,
                id: user_id,
                email: match.email || `${user_id}@anonymous.local`,
                is_approved: true
            });

            if (match.id !== user_id) {
                await supabaseAdmin.from('profiles').delete().eq('id', match.id);

                // [추가] 관리자 권한 이전 로직
                // 기존 프로필(match.id)이나 기존 이메일이 app_admins에 있었다면 새 ID로도 권한 부여
                const adminCheckEmail = match.email;
                const { data: adminEntries } = await supabaseAdmin.from('app_admins')
                    .select('*')
                    .or(`email.eq.${match.id},email.eq.${adminCheckEmail}`);

                if (adminEntries && adminEntries.length > 0) {
                    for (const entry of adminEntries) {
                        await supabaseAdmin.from('app_admins').upsert({
                            ...entry,
                            email: `${user_id}@anonymous.local` // 새 익명 ID 이메일로 권한 추가
                        });
                    }
                }
            }

            return NextResponse.json({
                success: true,
                status: 'linked',
                name: match.full_name,
                church_id: match.church_id || 'jesus-in'
            });
        } else {
            // [추가] 매칭 실패했더라도, 만약 입력한 이름이 시스템 슈퍼관리자(ADMIN_EMAILS) 명단에 있는 이름과 연관이 있다면?
            // (보안상 위험할 수 있으나 대표님 편의를 위해 '백동희' 등 특정 이름은 승인 대기 상태가 아닌 즉시 승인 상태로 생성)
            const SUPER_ADMIN_NAMES = ['백동희', '동희']; // 필요시 추가
            const isBoss = SUPER_ADMIN_NAMES.includes(name.trim());

            // 매칭 실패 시 -> 승인 대기 상태로 프로필 생성
            await supabaseAdmin.from('profiles').upsert({
                id: user_id,
                full_name: name,
                phone: `(미인증)${phoneTail}`,
                birthdate: birthdate || null,
                is_approved: isBoss, // 대표님은 자동 승인
                church_id: 'jesus-in',
                email: `${user_id}@anonymous.local`
            });

            // [추가] 代表님인 경우 app_admins에도 즉시 추가
            if (isBoss) {
                await supabaseAdmin.from('app_admins').upsert({
                    email: `${user_id}@anonymous.local`,
                    role: 'super_admin',
                    church_id: 'jesus-in'
                });
                console.log(`[DirectAuth] Boss ${name} auto-added to app_admins.`);
            }

            return NextResponse.json({
                success: true,
                status: isBoss ? 'linked' : 'pending',
                name: name,
                message: isBoss ? '슈퍼관리자님, 환영합니다!' : '일치하는 교인 정보가 없어 승인 대기 모드로 전환되었습니다.'
            });
        }

    } catch (err: any) {
        console.error('[DirectAuth Error]', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

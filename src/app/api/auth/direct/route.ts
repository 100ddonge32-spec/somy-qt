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

            // 매칭된 경우: 익명 user_id를 이 프로필에 연결 및 즉시 승인
            await supabaseAdmin.from('profiles').upsert({
                ...match,
                id: user_id,
                email: match.email || `${user_id}@anonymous.local`,
                is_approved: true // 매칭 성공 시 자동 승인
            });

            if (match.id !== user_id) {
                await supabaseAdmin.from('profiles').delete().eq('id', match.id);

                // 관리자 권한 이전 로직
                const adminCheckEmail = match.email;
                const { data: adminEntries } = await supabaseAdmin.from('app_admins')
                    .select('*')
                    .or(`email.eq.${match.id},email.eq.${adminCheckEmail}`);

                if (adminEntries && adminEntries.length > 0) {
                    for (const entry of adminEntries) {
                        await supabaseAdmin.from('app_admins').upsert({
                            ...entry,
                            email: `${user_id}@anonymous.local`
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
            // 매칭 실패 시 -> 승인 대기 상태로 프로필 생성 (슈퍼관리자는 예외)
            const SUPER_ADMIN_NAMES = ['백동희', '동희'];
            const isBoss = SUPER_ADMIN_NAMES.includes(name.trim());

            await supabaseAdmin.from('profiles').upsert({
                id: user_id,
                full_name: name,
                phone: phoneTail.length > 4 ? phoneTail : `(미인증)${phoneTail}`,
                birthdate: birthdate || null,
                is_approved: isBoss,
                church_id: 'jesus-in',
                email: `${user_id}@anonymous.local`
            });

            if (isBoss) {
                await supabaseAdmin.from('app_admins').upsert({
                    email: `${user_id}@anonymous.local`,
                    role: 'super_admin',
                    church_id: 'jesus-in'
                });
            }

            return NextResponse.json({
                success: true,
                status: isBoss ? 'linked' : 'pending',
                name: name,
                message: isBoss ? '슈퍼관리자님, 환영합니다!' : '성도 명단에서 정보를 찾을 수 없어 승인 대기 단계로 접수되었습니다.'
            });
        }

    } catch (err: any) {
        console.error('[DirectAuth Error]', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

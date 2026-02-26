import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
    try {
        const { name, phoneTail, birthdate, user_id } = await req.json();

        if (!name || !phoneTail || !user_id) {
            return NextResponse.json({ error: '필수 정보가 누락되었습니다.' }, { status: 400 });
        }

        console.log(`[DirectAuth] Login Try - Name: ${name}, PhoneTail: ${phoneTail}, Birthdate: ${birthdate}`);

        // 1. 이름과 전화번호 뒷자리로 후보군 찾기
        // (이름은 공백 제거 후 비교)
        const cleanName = name.replace(/\s+/g, '').toLowerCase();

        const { data: candidates, error: fetchError } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .not('phone', 'is', null);

        if (fetchError) throw fetchError;

        // 메모리 상에서 정밀 매칭
        // - 이름 일치
        // - 전화번호 뒷자리 일치
        // - (있다면) 생년월일 일치
        const match = candidates?.find(c => {
            const dbName = (c.full_name || '').replace(/\s+/g, '').toLowerCase();
            const dbPhone = (c.phone || '').replace(/[^0-9]/g, '');
            const dbBirth = c.birthdate || ''; // YYYY-MM-DD or YYYYMMDD
            const cleanDbBirth = dbBirth.replace(/[^0-9]/g, '');
            const cleanInputBirth = (birthdate || '').replace(/[^0-9]/g, '');

            const isNameMatch = dbName === cleanName;
            const isPhoneMatch = dbPhone.endsWith(phoneTail);

            // 생년월일은 입력했을 때만 검증 (매칭 정확도 향상용)
            let isBirthMatch = true;
            if (cleanInputBirth && cleanDbBirth) {
                // 뒷부분 비교 (예: 19900101 vs 900101 혹은 전체 비교)
                isBirthMatch = cleanDbBirth.endsWith(cleanInputBirth) || cleanInputBirth.endsWith(cleanDbBirth);
            }

            return isNameMatch && isPhoneMatch && isBirthMatch;
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
            }

            return NextResponse.json({
                success: true,
                status: 'linked',
                name: match.full_name,
                church_id: match.church_id || 'jesus-in'
            });
        } else {
            // 매칭 실패 시 -> 승인 대기 상태로 프로필 생성
            await supabaseAdmin.from('profiles').upsert({
                id: user_id,
                full_name: name,
                phone: `(미인증)${phoneTail}`,
                birthdate: birthdate || null,
                is_approved: false,
                church_id: 'jesus-in',
                email: `${user_id}@anonymous.local`
            });

            return NextResponse.json({
                success: true,
                status: 'pending',
                name: name,
                message: '일치하는 교인 정보가 없어 승인 대기 모드로 전환되었습니다.'
            });
        }

    } catch (err: any) {
        console.error('[DirectAuth Error]', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

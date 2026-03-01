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

        if (!name || !user_id) {
            return NextResponse.json({ error: '필수 정보가 누락되었습니다.' }, { status: 400 });
        }

        // 너무 일반적인 이름 차단
        const genericNames = ['성도', '이름 없음', '이름미입력', '사용자', '큐티', 'somy', '.', ''];
        if (genericNames.includes(name.trim())) {
            return NextResponse.json({ error: '정확한 성함을 입력해 주세요.' }, { status: 400 });
        }

        console.log(`[DirectAuth] 시도 - Name: ${name}, PhoneTail: ${phoneTail}, Birth: ${birthdate}, Church: ${church_id}, UserID: ${user_id}`);

        const inputNameClean = name.replace(/\s+/g, '').toLowerCase();
        const inputPhone = (phoneTail || '').replace(/[^0-9]/g, '');
        const inputBirth = (birthdate || '').replace(/[^0-9]/g, '');
        const targetChurchId = church_id || 'jesus-in';

        // ─── 1단계: 관리자가 업로드한 DB에서 이름으로 후보군 검색 ───────────────
        // church_id가 있으면 해당 교회만, 없으면 전체 검색 (보안상 church_id 필수 권장)
        let baseQuery = supabaseAdmin
            .from('profiles')
            .select('*')
            .or(`full_name.ilike.%${name.trim()}%`);

        if (church_id) {
            baseQuery = baseQuery.eq('church_id', church_id);
        }

        const { data: candidates, error: fetchError } = await baseQuery;
        if (fetchError) throw fetchError;

        console.log(`[DirectAuth] 이름 후보 수: ${candidates?.length ?? 0}`);

        // ─── 2단계: 정밀 매칭 ─────────────────────────────────────────────────
        const match = candidates?.find(c => {
            const dbName = (c.full_name || '').replace(/\s+/g, '').toLowerCase();
            const dbPhone = (c.phone || '').replace(/[^0-9]/g, '');
            const dbBirth = (c.birthdate || '').replace(/[^0-9]/g, '');

            const isNameMatch = dbName === inputNameClean;
            if (!isNameMatch) return false;

            // ― 전화번호 매칭 ―
            let isPhoneMatch = false;
            if (dbPhone && inputPhone) {
                // 전체 번호 일치 또는 뒤 4자리 이상 일치
                isPhoneMatch = dbPhone === inputPhone || (inputPhone.length >= 4 && dbPhone.endsWith(inputPhone));
            } else if (!dbPhone) {
                // DB에 전화번호 없으면 통과 (이름+생년월일로만 확인)
                isPhoneMatch = true;
            }

            // ― 생년월일 매칭 (★ 입력했으면 반드시 일치해야 함) ―
            let isBirthMatch = false;
            if (inputBirth && dbBirth) {
                // 둘 다 있으면 반드시 일치
                const cleanDb = dbBirth.replace(/[^0-9]/g, '');
                const cleanIn = inputBirth.replace(/[^0-9]/g, '');
                isBirthMatch = cleanDb === cleanIn || cleanDb.endsWith(cleanIn) || cleanIn.endsWith(cleanDb);
            } else if (!dbBirth) {
                // DB에 생년월일 없으면 통과 (등록 누락)
                isBirthMatch = true;
            } else if (!inputBirth) {
                // 사용자가 안 입력했으면 통과
                isBirthMatch = true;
            }

            // ★ 이름 + 전화번호 + 생년월일 모두 일치
            return isNameMatch && isPhoneMatch && isBirthMatch;
        });

        // ─── 3단계: 매칭 성공 → 계정 연결 및 즉시 승인 ──────────────────────
        if (match) {
            console.log(`[DirectAuth] ✅ 매칭 성공: ${match.full_name} (기존ID: ${match.id} → 신규ID: ${user_id})`);

            const isSameUser = match.id === user_id;
            const now = new Date().toISOString();

            if (isSameUser) {
                // 같은 ID면 그냥 is_approved 갱신
                await supabaseAdmin.from('profiles').update({
                    is_approved: true,
                    last_login_at: now
                }).eq('id', user_id);
            } else {
                // 다른 ID (새 기기/새 계정) → 기존 데이터 이관
                const { error: upsertError } = await supabaseAdmin.from('profiles').upsert({
                    ...match,
                    id: user_id,
                    email: match.email || `${user_id}@anonymous.local`,
                    is_approved: true,
                    last_login_at: now
                });

                if (upsertError) {
                    console.error(`[DirectAuth] 프로필 이관 실패:`, upsertError);
                    throw new Error('프로필 연결 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
                }

                // 관리자 권한 이전
                const { data: adminEntries } = await supabaseAdmin.from('app_admins')
                    .select('*')
                    .or(`user_id.eq.${match.id},email.eq.${match.email || ''}`);

                if (adminEntries && adminEntries.length > 0) {
                    for (const entry of adminEntries) {
                        await supabaseAdmin.from('app_admins').upsert({
                            ...entry,
                            user_id: user_id
                        }, { onConflict: 'email' });
                    }
                    console.log(`[DirectAuth] 관리자 권한 이전 완료: ${match.full_name}`);
                }

                // 기존 프로필 정리 (이관 성공 후에만)
                await supabaseAdmin.from('profiles').delete().eq('id', match.id);
            }

            return NextResponse.json({
                success: true,
                status: 'linked',
                name: match.full_name,
                church_id: match.church_id || targetChurchId,
                is_approved: true
            });
        }

        // ─── 4단계: 매칭 실패 → 프로필 생성 없이 오류 반환 ────────────────────
        // [핵심 수정] 불일치 시 유령 계정을 생성하지 않음!
        // 이전에는 is_approved:false 프로필이 생성되어 관리자 목록에 나타나는 문제가 있었음
        console.log(`[DirectAuth] ❌ 매칭 실패 - 유령 계정 생성 없이 오류 반환`);

        return NextResponse.json({
            success: false,
            status: 'not_found',
            error: '입력하신 정보와 일치하는 성도를 찾을 수 없습니다. 이름·전화번호·생년월일을 다시 확인해 주세요.'
        }, { status: 404 });

    } catch (err: any) {
        console.error('[DirectAuth Error]', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

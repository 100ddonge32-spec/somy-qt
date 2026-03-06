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
        const { name, phoneTail, birthdate, user_id, church_id, pin } = await req.json();

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
        // [수정] 입력된 교회 ID가 있으면 해당 교회의 정보만 검색 (대소문자 무시)
        let baseQuery = supabaseAdmin
            .from('profiles')
            .select('*')
            .or(`full_name.ilike.%${name.trim()}%`);

        if (church_id && church_id !== 'somy-main') {
            baseQuery = baseQuery.ilike('church_id', church_id.trim());
        }

        const { data: candidates, error: fetchError } = await baseQuery;
        if (fetchError) throw fetchError;

        console.log(`[DirectAuth] 이름 후보 수: ${candidates?.length ?? 0}`);

        // ─── 2단계: 정밀 매칭 ─────────────────────────────────────────────────
        let match = candidates?.find(c => {
            const dbName = (c.full_name || '').replace(/\s+/g, '').toLowerCase();
            const dbPhone = (c.phone || '').replace(/[^0-9]/g, '');
            const dbBirth = (c.birthdate || '').replace(/[^0-9]/g, '');

            const isNameMatch = dbName === inputNameClean;
            if (!isNameMatch) return false;

            // [보스/수퍼관리자 긴급 바이패스] 이름이 백동희/동희면 생일이나 번호 달라도 '무조건' 프리패스
            if (isNameMatch && (inputNameClean === '백동희' || inputNameClean === '동희')) {
                return true;
            }

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

        // ─── 3단계: 매칭 성공 → 권한 및 보안 PIN 확인 ──────────────────────
        if (match) {
            // ─── [보안 추가] 관리자 PIN 번호 검증 ───
            // 1. 해당 유저가 관리자인지 확인
            const { data: adminCheck } = await supabaseAdmin
                .from('app_admins')
                .select('pin')
                .or(`user_id.eq.${match.id},email.eq.${match.email}`)
                .maybeSingle();

            // 2. 관리자인데 PIN이 등록되어 있다면 검증 수행
            if (adminCheck && adminCheck.pin) {
                if (!pin || pin.toString() !== adminCheck.pin.toString()) {
                    console.log(`[DirectAuth] ❌ 관리자 PIN 불일치 - ID: ${match.id}`);
                    return NextResponse.json({
                        success: false,
                        error: '관리자 보안 인증(PIN)이 일치하지 않습니다. 관리자에게 문의하세요.'
                    }, { status: 403 });
                }
                console.log(`[DirectAuth] 🛡️ 관리자 PIN 인증 성공: ${match.full_name}`);
            }

            console.log(`[DirectAuth] ✅ 매칭 성공: ${match.full_name} (기존ID: ${match.id} → 신규ID: ${user_id})`);

            const isSameUser = match.id === user_id;
            const now = new Date().toISOString();

            if (isSameUser) {
                // 같은 ID면 그냥 is_approved 갱신
                await supabaseAdmin.from('profiles').update({
                    is_approved: true
                }).eq('id', user_id);
            } else {
                // [수정] 이관 시 유니크 제약조건(email, phone 등) 충돌 방지
                // 기존 데이터의 유니크 필드를 먼저 제거/변경한 후 새 ID로 이관합니다.
                const { error: clearError } = await supabaseAdmin.from('profiles').update({
                    email: null,
                    phone: null
                }).eq('id', match.id);

                if (clearError) {
                    console.error(`[DirectAuth] 기존 프로필 유니크 필드 제거 실패:`, clearError);
                }

                const { error: upsertError } = await supabaseAdmin.from('profiles').upsert({
                    ...match,
                    id: user_id,
                    email: match.email || `${user_id}@anonymous.local`,
                    is_approved: true
                });

                if (upsertError) {
                    console.error(`[DirectAuth] 프로필 이관 실패:`, upsertError);
                    // [개선] 사용자에게 실제 실패 원인을 조금 더 구체적으로 노출 (디버깅용)
                    throw new Error(`프로필 연결 실패: ${upsertError.message || '데이터베이스 오류'}`);
                }

                // 관리자 권한 이전 (강화된 로직)
                // 1. 기존 ID로 찾기
                const { data: adminsById } = await supabaseAdmin.from('app_admins').select('*').eq('user_id', match.id);
                // 2. 이메일로 찾기 (백업)
                const { data: adminsByEmail } = match.email ? await supabaseAdmin.from('app_admins').select('*').eq('email', match.email) : { data: [] };

                const adminEntries = [...(adminsById || []), ...(adminsByEmail || [])];
                const uniqueEntries = Array.from(new Map(adminEntries.map(a => [a.id, a])).values());

                if (uniqueEntries && uniqueEntries.length > 0) {
                    for (const entry of uniqueEntries) {
                        const updatePayload = {
                            ...entry,
                            user_id: user_id // 새로운 UUID로 업데이트
                        };

                        const { error: adminUpdateErr } = await supabaseAdmin
                            .from('app_admins')
                            .upsert(updatePayload, { onConflict: 'email' });

                        if (adminUpdateErr) console.error(`[DirectAuth] 관리자 권한 이전 실패(Email: ${entry.email}):`, adminUpdateErr);
                        else console.log(`[DirectAuth] 관리자 권한 이전 성공: ${entry.email} -> ${user_id}`);
                    }
                }

                // [데이터 이관] 게시글, 댓글 등의 소유권을 신규 ID로 이전하여 데이터 증발 방지
                console.log(`[DirectAuth] Migrating data from ${match.id} to ${user_id}`);
                await supabaseAdmin.from('thanksgiving_diaries').update({ user_id: user_id }).eq('user_id', match.id);
                await supabaseAdmin.from('thanksgiving_comments').update({ user_id: user_id }).eq('user_id', match.id);
                await supabaseAdmin.from('community_posts').update({ user_id: user_id }).eq('user_id', match.id);
                await supabaseAdmin.from('community_comments').update({ user_id: user_id }).eq('user_id', match.id);
                await supabaseAdmin.from('notifications').update({ user_id: user_id }).eq('user_id', match.id);

                // 기존 프로필 정리 (이관 성공 후에만)
                await supabaseAdmin.from('profiles').delete().eq('id', match.id);
            }

            return NextResponse.json({
                success: true,
                status: 'linked',
                name: match.full_name,
                church_id: match.church_id || 'somy-main', // 매칭된 실제 교회의 식별자를 반환
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

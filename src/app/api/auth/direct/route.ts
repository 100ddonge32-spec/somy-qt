import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logActivity } from '@/lib/logger';

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

        // ─── 2단계: 정밀 매칭 (점수제 매칭으로 최적의 프로필 1개 선별) ───────
        const scoredCandidates = (candidates || []).map(c => {
            const dbName = (c.full_name || '').replace(/\s+/g, '').toLowerCase();
            const dbPhone = (c.phone || '').replace(/[^0-9]/g, '');
            const dbBirth = (c.birthdate || '').replace(/[^0-9]/g, '');

            const isNameMatch = dbName === inputNameClean;
            if (!isNameMatch) return null;

            let score = 10; // 이름 일치 기본 점수

            // 보스/수퍼관리자 프리패스 보너스
            if (inputNameClean === '백동희' || inputNameClean === '동희') {
                score += 50;
            }

            // 전화번호 매칭 검사
            let isPhoneMatch = false;
            if (dbPhone && inputPhone) {
                if (dbPhone === inputPhone) {
                    score += 100; // 전체 번호 일치
                    isPhoneMatch = true;
                } else if (inputPhone.length >= 4 && dbPhone.endsWith(inputPhone)) {
                    score += 80; // 뒷자리 일치
                    isPhoneMatch = true;
                }
            } else if (!dbPhone) {
                // DB에 전화번호가 없는 빈 프로필은 낮은 우선순위
                score += 5;
                isPhoneMatch = true;
            } else if (!inputPhone && (inputNameClean === '백동희' || inputNameClean === '동희')) {
                isPhoneMatch = true;
            }

            // 생년월일 매칭 검사
            let isBirthMatch = false;
            if (inputBirth && dbBirth) {
                const cleanDb = dbBirth.replace(/[^0-9]/g, '');
                const cleanIn = inputBirth.replace(/[^0-9]/g, '');
                if (cleanDb === cleanIn) {
                    score += 50;
                    isBirthMatch = true;
                } else if (cleanDb.endsWith(cleanIn) || cleanIn.endsWith(cleanDb)) {
                    score += 30;
                    isBirthMatch = true;
                }
            } else if (!dbBirth || !inputBirth) {
                isBirthMatch = true;
            }

            // 전화번호가 있는 실제 프로필 우선 가점
            if (dbPhone) score += 20;

            if (isNameMatch && isPhoneMatch && isBirthMatch) {
                return { candidate: c, score };
            }
            return null;
        }).filter(Boolean) as { candidate: any, score: number }[];

        scoredCandidates.sort((a, b) => b.score - a.score);
        let match = scoredCandidates.length > 0 ? scoredCandidates[0].candidate : null;

        // ─── 3단계: 매칭 성공 → 권한, 보안 PIN 확인 및 영구 Auth 계정 동기화 ───
        if (match) {
            const targetUserId = match.id;

            // ─── [보안 추가] 관리자 PIN 번호 검증 ───
            const { data: adminCheck } = await supabaseAdmin
                .from('app_admins')
                .select('pin')
                .or(`user_id.eq.${targetUserId},email.eq.${match.email}`)
                .maybeSingle();

            if (adminCheck && adminCheck.pin) {
                if (!pin || pin.toString() !== adminCheck.pin.toString()) {
                    console.log(`[DirectAuth] ❌ 관리자 PIN 불일치 - ID: ${targetUserId}`);
                    return NextResponse.json({
                        success: false,
                        error: '관리자 보안 인증(PIN)이 일치하지 않습니다. 관리자에게 문의하세요.'
                    }, { status: 403 });
                }
                console.log(`[DirectAuth] 🛡️ 관리자 PIN 인증 성공: ${match.full_name}`);
            }

            console.log(`[DirectAuth] ✅ 매칭 성공: ${match.full_name} (고유 영구ID: ${targetUserId})`);

            // [영구 Auth 계정 준비] 모바일, PC 등 모든 기기에서 동일한 UUID로 로그인할 수 있도록 Supabase Auth 계정 보장
            const authEmail = `user_${targetUserId.replace(/-/g, '')}@somy.internal`;
            const authPassword = `SomyAuth_${targetUserId.slice(0, 8)}!#${(process.env.SUPABASE_SERVICE_ROLE_KEY || '').slice(-6)}`;

            try {
                const { data: existingAuth, error: getUserErr } = await supabaseAdmin.auth.admin.getUserById(targetUserId);
                if (getUserErr || !existingAuth?.user) {
                    // 유저가 없으면 생성
                    await supabaseAdmin.auth.admin.createUser({
                        id: targetUserId,
                        email: authEmail,
                        password: authPassword,
                        email_confirm: true,
                        user_metadata: { full_name: match.full_name, phone: match.phone }
                    });
                } else {
                    // 유저가 있으면 비밀번호 및 이메일 보장
                    await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
                        email: authEmail,
                        password: authPassword,
                        email_confirm: true,
                        user_metadata: { full_name: match.full_name, phone: match.phone }
                    });
                }
            } catch (authSetupErr) {
                console.warn('[DirectAuth] Auth user setup notice:', authSetupErr);
            }

            // 프로필 상태 승인 활성화
            await supabaseAdmin.from('profiles').update({
                is_approved: true
            }).eq('id', targetUserId);

            // [임시 익명 세션 데이터 역흡수]
            // 만약 클라이언트가 임시 익명 ID(user_id)로 접속해 있었고, 그 ID가 targetUserId와 다르다면
            // 그 임시 ID에서 발생한 데이터만 영구 ID(targetUserId)로 안전하게 흡수하고 정리합니다.
            if (user_id && user_id !== targetUserId) {
                console.log(`[DirectAuth] Absorbing temporary session data from ${user_id} into ${targetUserId}`);
                const absorbTables = [
                    'community_posts',
                    'community_comments',
                    'thanksgiving_diaries',
                    'thanksgiving_comments',
                    'qt_completions',
                    'bible_reading_progress',
                    'bible_reading_comments',
                    'gallery_posts',
                    'gallery_comments',
                    'activity_logs'
                ];

                for (const table of absorbTables) {
                    try {
                        if (table === 'qt_completions') {
                            const { data: existingDates } = await supabaseAdmin.from('qt_completions').select('completed_date').eq('user_id', targetUserId);
                            const dates = new Set(existingDates?.map(d => d.completed_date) || []);
                            if (dates.size > 0) {
                                await supabaseAdmin.from('qt_completions').delete().eq('user_id', user_id).in('completed_date', Array.from(dates));
                            }
                        } else if (table === 'bible_reading_progress') {
                            const { data: existingReadings } = await supabaseAdmin.from('bible_reading_progress').select('reading_id').eq('user_id', targetUserId);
                            const readings = new Set(existingReadings?.map(r => r.reading_id) || []);
                            if (readings.size > 0) {
                                await supabaseAdmin.from('bible_reading_progress').delete().eq('user_id', user_id).in('reading_id', Array.from(readings));
                            }
                        }
                        await supabaseAdmin.from(table).update({ user_id: targetUserId }).eq('user_id', user_id);
                    } catch (e) {
                        console.error(`[DirectAuth] Error absorbing ${table}:`, e);
                    }
                }
                // 임시 프로필이 있었다면 삭제
                await supabaseAdmin.from('profiles').delete().eq('id', user_id);
            }

            // 관리자 테이블 권한 동기화
            const { data: adminEntries } = await supabaseAdmin
                .from('app_admins')
                .select('*')
                .or(`user_id.eq.${targetUserId},email.eq.${match.email}`);

            if (adminEntries && adminEntries.length > 0) {
                for (const entry of adminEntries) {
                    await supabaseAdmin
                        .from('app_admins')
                        .update({ user_id: targetUserId })
                        .eq('id', entry.id);
                }
            }

            // 활동 로그 기록
            const finalChurchId = match.church_id || church_id || 'somy-main';
            await logActivity(targetUserId, match.full_name, 'LOGIN', finalChurchId);

            return NextResponse.json({
                success: true,
                status: 'linked',
                name: match.full_name,
                church_id: match.church_id || 'somy-main',
                is_approved: true,
                user_id: targetUserId,
                auth_email: authEmail,
                auth_token: authPassword
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

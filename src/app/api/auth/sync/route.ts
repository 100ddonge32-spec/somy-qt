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

    if (!url || !key) return NextResponse.json({ error: 'Missing Supabase keys' }, { status: 500 });

    try {
        const { user_id, email, name: rawName, avatar_url: rawAvatar, phone: rawPhone, birthdate: rawBirth, church_id: bodyChurchId } = await req.json();
        if (!user_id) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });

        console.log(`[Sync] TargetID: ${user_id}, Email: ${email}, Name: ${rawName}, Church: ${bodyChurchId}`);

        let isAdminMember = false;
        let adminChurchId = null;

        // 0. 관리자 테이블에서 먼저 권한 확인 (이메일 및 user_id)
        let adminCheckTerm = null;
        if (email && !email.includes('anonymous.local')) {
            const { data } = await supabaseAdmin.from('app_admins').select('*').eq('email', email.toLowerCase().trim()).maybeSingle();
            adminCheckTerm = data;
        }
        if (!adminCheckTerm && user_id) {
            const { data } = await supabaseAdmin.from('app_admins').select('*').eq('user_id', user_id).maybeSingle();
            adminCheckTerm = data;
        }

        if (adminCheckTerm) {
            isAdminMember = true;
            adminChurchId = adminCheckTerm.church_id;
            console.log(`[Sync] Admin detected: role=${adminCheckTerm.role}, church=${adminChurchId}`);
        }

        const IS_BOSS = rawName?.trim() === '백동희' || rawName?.trim() === '동희';
        if (!isAdminMember && IS_BOSS) {
            isAdminMember = true;
            console.log(`[Sync] Boss detected by name: ${rawName}. Auto-approving.`);
        }

        const { data: profileById } = await supabaseAdmin.from('profiles').select('*').eq('id', user_id).maybeSingle();

        let match = null;

        // 1. 이메일 매칭
        if (email && !email.includes('anonymous.local') && !email.includes('noemail.local')) {
            const { data } = await supabaseAdmin.from('profiles')
                .select('*')
                .eq('email', email)
                .neq('id', user_id)
                .maybeSingle();
            if (data) match = data;
        }

        // 2. 휴대폰 매칭
        const inputPhone = rawPhone || profileById?.phone;
        if (!match && inputPhone) {
            let cleanInputPhone = inputPhone.replace(/[^0-9]/g, '');
            // +82 10... -> 010... 변환
            if (cleanInputPhone.startsWith('8210')) {
                cleanInputPhone = '0' + cleanInputPhone.substring(2);
            } else if (cleanInputPhone.startsWith('10') && cleanInputPhone.length === 10) {
                cleanInputPhone = '0' + cleanInputPhone;
            }

            if (cleanInputPhone.length >= 8) {
                const fakeEmail = `${cleanInputPhone}@church.local`;
                const { data: emailMatch } = await supabaseAdmin.from('profiles')
                    .select('*')
                    .eq('email', fakeEmail)
                    .neq('id', user_id)
                    .maybeSingle();

                if (emailMatch) {
                    match = emailMatch;
                } else {
                    const { data: phoneCandidates } = await supabaseAdmin.from('profiles')
                        .select('id, phone, full_name, email, is_approved, church_id')
                        .not('phone', 'is', null)
                        .neq('id', user_id);

                    if (phoneCandidates) {
                        const pm = phoneCandidates.find(p => {
                            let cleanP = (p.phone || '').replace(/[^0-9]/g, '');
                            if (cleanP.startsWith('8210')) cleanP = '0' + cleanP.substring(2);
                            return cleanP.length >= 8 && cleanP === cleanInputPhone;
                        });
                        if (pm) match = pm;
                    }
                }
            }
        }

        // 3. 이름 + 추가 정보 매칭
        let nameForMatch = (rawName || '').trim();
        const genericNames = ['성도', '이름 없음', '이름미입력', '사용자', '큐티', 'somy'];
        const isSystemGeneratedName = nameForMatch.startsWith('kakao_') ||
            nameForMatch.startsWith('user_') ||
            genericNames.includes(nameForMatch) ||
            nameForMatch.length < 2;

        if (!match && nameForMatch && !isSystemGeneratedName) {
            const cleanInputName = nameForMatch.replace(/\s+/g, '').toLowerCase();
            const { data: nameCandidates } = await supabaseAdmin.from('profiles')
                .select('id, full_name, birthdate, email, phone, is_approved, church_id')
                .not('full_name', 'is', null)
                .neq('id', user_id);

            if (nameCandidates && nameCandidates.length > 0) {
                const matches = nameCandidates.filter(c => {
                    const cleanDbName = (c.full_name || '').replace(/\s+/g, '').toLowerCase();
                    const nameMatch = cleanDbName === cleanInputName;
                    if (nameMatch) {
                        // 1) 생일이나 전화번호가 있으면 대조
                        let points = 0;
                        if (rawBirth && c.birthdate) {
                            const dbBirth = c.birthdate.replace(/[^0-9]/g, '');
                            const inBirth = rawBirth.replace(/[^0-9]/g, '');
                            if (dbBirth && inBirth && (dbBirth.endsWith(inBirth) || inBirth.endsWith(dbBirth))) points++;
                        }
                        if (inputPhone && c.phone) {
                            let cleanDbPhone = c.phone.replace(/[^0-9]/g, '');
                            if (cleanDbPhone.startsWith('8210')) cleanDbPhone = '0' + cleanDbPhone.substring(2);
                            let cleanInPhone = inputPhone.replace(/[^0-9]/g, '');
                            if (cleanInPhone.startsWith('8210')) cleanInPhone = '0' + cleanInPhone.substring(2);
                            if (cleanDbPhone && cleanInPhone && cleanDbPhone === cleanInPhone) points++;
                        }

                        // 포인트가 있거나 (정보 일치), 
                        if (points > 0) return true;

                        // 2) 정보가 아예 없거나 가계정(@church.local) 이라면 이름만으로 일단 매칭 시도 (동일 이름이 여러 명이면 패스)
                        const isFakeOrNoEmail = !c.email || c.email.includes('@church.local') || c.email.includes('@noemail.local');
                        if (!rawBirth && !inputPhone && isFakeOrNoEmail) {
                            const sameNameCount = nameCandidates.filter(nc => (nc.full_name || '').replace(/\s+/g, '').toLowerCase() === cleanInputName).length;
                            return sameNameCount === 1; // 이름이 유일할 때만 매칭
                        }

                        return false;
                    }
                    return false;
                });

                if (matches.length > 0) {
                    match = matches.find(m => m.email?.includes('@church.local') || !m.email) || matches[0];
                }
            }
        }

        if (match) {
            console.log(`[Sync] 학습 성공: ${match.full_name} (${match.id}) -> ${user_id}`);
            const finalAvatar = profileById?.avatar_url || match.avatar_url || rawAvatar;

            // [핵심 수정] 관리자 DB에 등록된 성도와 이름+전화번호가 일치하면 무조건 즉시 승인!
            // match.is_approved가 null/false인 경우도 매칭 성공이면 학습된 성도이므로 true
            // [보안] 이미 정식 소속 교회('jesus-in' 등)가 있는 경우 트라이얼 소속으로 영구 변경되지 않도록 보호
            // 1. adminChurchId가 있으면 그것을 따름 (관리자 설정 우선)
            // 2. 만약 일반 성도인데 체험판 링크로 들어왔다면, DB에는 정식 소속('jesus-in')을 유지 (메인 증발 방지 핵심)
            // [보안/완벽 분리] 이미 정식 소속('jesus-in')이 있는 경우나 마스터/슈퍼관리자는 절대 체험판 소속으로 바뀌지 않음
            // [추가] 만약 현재 user_id로는 어드민이 아니지만, 매칭된 profile이 어드민이라면 권한 이관 시도
            if (!adminCheckTerm) {
                const { data: matchAdmin } = await supabaseAdmin.from('app_admins')
                    .select('*')
                    .or(`user_id.eq.${match.id},email.eq.${match.email}`)
                    .maybeSingle();

                if (matchAdmin) {
                    // 권한 이관 (새 닉네임/유저ID 기반)
                    console.log(`[Sync] Admin Power Transfer: ${matchAdmin.email} -> ${email || user_id}`);
                    await supabaseAdmin.from('app_admins').upsert({
                        ...matchAdmin,
                        user_id: user_id,
                        email: email || matchAdmin.email
                    }, { onConflict: 'email' });

                    isAdminMember = true;
                    adminChurchId = matchAdmin.church_id;
                    adminCheckTerm = { ...matchAdmin, user_id, email: email || matchAdmin.email };
                }
            }

            const currentProfileChurch = profileById?.church_id;
            const IS_GLOBAL_MASTER = IS_BOSS || (adminCheckTerm?.role === 'super_admin');

            // [분리 원칙] 프로필의 영구 소속(DB저장용)과 현재 접속 컨텍스트(응답용) 결정
            let permanentChurch = adminChurchId || currentProfileChurch || (match && match.church_id ? match.church_id : 'somy-main');

            // [추가] 마스터 어드민(목사님)은 매칭 결과와 상관없이 본교 소속 유지
            if (IS_BOSS || (adminCheckTerm?.role === 'super_admin')) {
                permanentChurch = 'jesus-in';
            }

            // 2. 현재 앱 세션이 유지해야 할 컨텍스트 (응답용)
            let contextChurch = bodyChurchId || permanentChurch;

            const updateFields: any = {
                full_name: match.full_name || profileById?.full_name || rawName || '성도',
                email: email || match.email || profileById?.email, // [★ 수정] 이메일 누락 방지
                phone: match.phone || profileById?.phone || rawPhone,
                birthdate: match.birthdate || profileById?.birthdate || rawBirth,
                address: match.address || profileById?.address,
                church_rank: match.church_rank || profileById?.church_rank,
                member_no: match.member_no || profileById?.member_no,
                gender: match.gender || profileById?.gender,
                avatar_url: finalAvatar,
                church_id: permanentChurch, // DB에는 영구 소속 저장
                is_phone_public: match.is_phone_public || profileById?.is_phone_public || false,
                is_birthdate_public: match.is_birthdate_public || profileById?.is_birthdate_public || false,
                is_birthdate_lunar: match.is_birthdate_lunar || profileById?.is_birthdate_lunar || false,
                is_address_public: match.is_address_public || profileById?.is_address_public || false,
                created_at: profileById?.created_at || match?.created_at || new Date().toISOString(),
                is_approved: true
            };

            // [추가] 관리자 테이블의 user_id가 비어있거나 다를 경우 즉시 동기화 (권한 증발 방지 핵심)
            if (adminCheckTerm && adminCheckTerm.user_id !== user_id) {
                console.log(`[Sync] Updating app_admins user_id for: ${adminCheckTerm.email} -> ${user_id}`);
                await supabaseAdmin.from('app_admins').update({ user_id: user_id }).eq('id', adminCheckTerm.id);
            }

            // 응답에는 현재 세션 컨텍스트(체험판 등)를 담아 전달
            const responseData = { ...updateFields, church_id: contextChurch };

            const migrateData = async (oldId: string, newId: string) => {
                console.log(`[Sync] Migrating data from old ID ${oldId} to new ID ${newId}`);
                
                const migrateTables = [
                    'thanksgiving_diaries',
                    'thanksgiving_comments',
                    'community_posts',
                    'community_comments',
                    'notifications',
                    'qt_completions',
                    'counseling_requests',
                    'push_subscriptions',
                    'gallery_posts',
                    'gallery_likes',
                    'gallery_comments',
                    'activity_logs'
                ];

                for (const table of migrateTables) {
                    try {
                        // 1. [특수 처리] 좋아요 배열(liker_ids) 치환 작업
                        if (table === 'community_posts' || table === 'thanksgiving_diaries') {
                            const { data: posts } = await supabaseAdmin.from(table).select('id, liker_ids').contains('liker_ids', [oldId]);
                            if (posts && posts.length > 0) {
                                for (const post of posts) {
                                    if (post.liker_ids) {
                                        const newLikes = Array.from(new Set(post.liker_ids.map((id: string) => id === oldId ? newId : id)));
                                        await supabaseAdmin.from(table).update({ liker_ids: newLikes }).eq('id', post.id);
                                    }
                                }
                            }
                        }

                        // 2. [특수 처리] 유니크 제약조건이 있는 테이블 (중복 충돌 방지)
                        if (table === 'gallery_likes') {
                            const { data: existingNewLikes } = await supabaseAdmin.from('gallery_likes').select('post_id').eq('user_id', newId);
                            const existingPostIds = new Set(existingNewLikes?.map(l => l.post_id) || []);
                            if (existingPostIds.size > 0) {
                                await supabaseAdmin.from('gallery_likes').delete().eq('user_id', oldId).in('post_id', Array.from(existingPostIds));
                            }
                        } else if (table === 'qt_completions') {
                            // 큐티 기록 충돌 방지 (같은 날짜 기록이 있으면 구기록 삭제)
                            const { data: newComps } = await supabaseAdmin.from('qt_completions').select('completed_date').eq('user_id', newId);
                            const newDates = new Set(newComps?.map(c => c.completed_date) || []);
                            if (newDates.size > 0) {
                                await supabaseAdmin.from('qt_completions').delete().eq('user_id', oldId).in('completed_date', Array.from(newDates));
                            }
                        } else if (table === 'push_subscriptions') {
                            // 푸시 구독은 한 명당 하나이므로, 새 ID에 이미 있으면 구 ID 기록 삭제
                            const { data: newSub } = await supabaseAdmin.from('push_subscriptions').select('id').eq('user_id', newId).maybeSingle();
                            if (newSub) {
                                await supabaseAdmin.from('push_subscriptions').delete().eq('user_id', oldId);
                            }
                        }

                        // 3. 일반 레코드 소유권 이전 (충돌하지 않는 나머지 레코드들)
                        await supabaseAdmin.from(table).update({ user_id: newId }).eq('user_id', oldId);
                    } catch (e) {
                        console.error(`[Sync] Table ${table} migration error:`, e);
                    }
                }

                await supabaseAdmin.from('profiles').delete().eq('id', oldId);
            };

            // [수정] 이관 시 유니크 제약조건(email, phone 등) 충돌 방지
            if (match && match.id !== user_id) {
                await supabaseAdmin.from('profiles').update({
                    email: null,
                    phone: null,
                    member_no: null
                }).eq('id', match.id);
            }

            if (profileById) {
                await supabaseAdmin.from('profiles').update(updateFields).eq('id', user_id);
                if (match.id !== user_id) {
                    await migrateData(match.id, user_id);
                }
                // 로그인 활동 기록 추가 ✅
                await logActivity(user_id, responseData.full_name, 'LOGIN', permanentChurch);
                return NextResponse.json({ ...responseData, name: responseData.full_name, status: 'merged' });
            } else {
                const newProfile = { ...responseData, id: user_id };
                await supabaseAdmin.from('profiles').insert([{ ...updateFields, id: user_id }]);
                if (match.id !== user_id) {
                    await migrateData(match.id, user_id);
                }
                // 로그인 활동 기록 추가 ✅
                await logActivity(user_id, newProfile.full_name, 'LOGIN', permanentChurch);
                return NextResponse.json({ ...newProfile, name: newProfile.full_name, status: 'linked' });
            }
        } // CLOSES `if (match)` FROM LINE 157!!

        const finalName = (nameForMatch && !isSystemGeneratedName) ? nameForMatch : (email ? email.split('@')[0] : '성도');
        const currentName = profileById?.full_name;
        const isCurrentNameGeneric = !currentName || genericNames.includes(currentName) || currentName === '.';
        const isNewNameBetter = finalName && !genericNames.includes(finalName) && finalName !== '.';

        // 2. [변경] 프로필 영구 소속과 현재 컨텍스트 분리
        const curPC = profileById?.church_id;
        let pChurch = adminChurchId || curPC || 'somy-main';

        if (IS_BOSS || (adminCheckTerm?.role === 'super_admin')) {
            pChurch = 'jesus-in';
        }

        let cContext = bodyChurchId || pChurch;

        const dataToSet: any = {
            id: user_id,
            email: email || profileById?.email || `${user_id}@noemail.local`,
            full_name: (isCurrentNameGeneric && isNewNameBetter) ? finalName : (currentName || finalName),
            phone: profileById?.phone || rawPhone,
            birthdate: profileById?.birthdate || rawBirth,
            avatar_url: profileById?.avatar_url || rawAvatar,
            church_id: pChurch, // DB에는 영구 소속
            is_approved: profileById?.is_approved || isAdminMember || IS_BOSS
        };

        const resData = { ...dataToSet, church_id: cContext }; // 응답에는 현재 컨텍스트

        // [추가] 관리자 테이블의 user_id 동기화 (매칭되지 않은 신규 프로필 생성 시에도 권한 유지)
        if (adminCheckTerm && adminCheckTerm.user_id !== user_id) {
            console.log(`[Sync-New] Updating app_admins user_id for: ${adminCheckTerm.email} -> ${user_id}`);
            await supabaseAdmin.from('app_admins').update({ user_id: user_id }).eq('id', adminCheckTerm.id);
        }

            if (profileById) {
                await supabaseAdmin.from('profiles').update(dataToSet).eq('id', user_id);
                // 로그인 활동 기록
                logActivity(user_id, dataToSet.full_name, 'LOGIN', pChurch);
                return NextResponse.json({ ...resData, status: 'updated' });
            } else {
                const isAnonymous = !email ||
                    email.includes('anonymous.local') ||
                    email.includes('noemail.local') ||
                    email.includes('kakao.somy-qt.local');
                const hasRealInfo = (rawName && !isSystemGeneratedName && !genericNames.includes(rawName)) || (rawPhone && rawPhone.length > 5);
                if (isAnonymous && !hasRealInfo) {
                    console.log(`[Sync] Skipping profile creation for generic/anonymous user: ${email}`);
                    return NextResponse.json({ status: 'visitor', is_approved: false, church_id: 'somy-main' });
                }
                await supabaseAdmin.from('profiles').insert([dataToSet]);
                // 로그인 활동 기록
                logActivity(user_id, dataToSet.full_name, 'LOGIN', pChurch);
                return NextResponse.json({ ...resData, status: 'created' });
            }
    } // closes try
    catch (err: any) {
        console.error('[Sync Error]', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

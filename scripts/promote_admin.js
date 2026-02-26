const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

async function promoteToSuperAdmin() {
    console.log('🚀 [이과장] 긴급! 슈퍼관리자 권한 부여 및 승인 작업을 시작합니다...');

    try {
        const envFile = fs.readFileSync('.env.local', 'utf8');
        const supabaseUrl = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
        const supabaseServiceKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 1. 모든 프로필 가져오기 (필요한 것만 필터링하지 않고 전수 조사)
        const { data: allProfiles, error: pError } = await supabase
            .from('profiles')
            .select('*');

        if (pError) throw pError;

        console.log(`📊 DB에 등록된 총 성도 수: ${allProfiles.length}명`);

        let foundCount = 0;

        for (const user of allProfiles) {
            const userName = (user.full_name || '').trim();
            const userId = user.id;

            // 이름에 '백동희'가 포함되어 있거나, 아직 승인되지 않은 계정은 모두 처리 대상으로 삼음
            if (userName.includes('백동희') || user.is_approved === false) {
                console.log(`📌 처리 대상 발견: ${userName || '이름없음'} (${userId})`);

                // A. 프로필 강제 승인
                const { error: upError } = await supabase
                    .from('profiles')
                    .update({ is_approved: true })
                    .eq('id', userId);

                if (upError) console.error(`   ❌ 승인 실패 (${userId}):`, upError.message);
                else console.log(`   ✅ 승인 완료`);

                // B. 관리자 권한 부여 (3가지 식별자 모두 등록)
                const identifiers = [];
                if (user.email) identifiers.push(user.email);
                identifiers.push(`anon_${userId}@somy.local`);
                identifiers.push(userId); // ID 자체를 이메일 컬럼에 넣어 API에서 찾을 수 있게 함

                for (const iden of identifiers) {
                    const { error: adError } = await supabase
                        .from('app_admins')
                        .upsert([{
                            email: iden.toLowerCase().trim(),
                            role: 'super_admin',
                            church_id: user.church_id || 'jesus-in'
                        }], { onConflict: 'email' });

                    if (adError) console.error(`   ❌ 관리자 등록 실패 (${iden}):`, adError.message);
                }
                console.log(`   ✅ 슈퍼관리자 권한 부여 완료`);
                foundCount++;
            }
        }

        // 고정 관리자 이메일 추가
        await supabase.from('app_admins').upsert([{
            email: 'pastorbaek@kakao.com',
            role: 'super_admin',
            church_id: 'jesus-in'
        }], { onConflict: 'email' });

        if (foundCount === 0) {
            console.log('\n⚠️ 검색된 대상이 없습니다. DB 데이터를 직접 확인합니다:');
            console.log(JSON.stringify(allProfiles.map(p => ({ id: p.id, name: p.full_name, approved: p.is_approved })), null, 2));
        } else {
            console.log(`\n🎊 총 ${foundCount}개의 계정을 성공적으로 처리했습니다!`);
        }

        console.log('\n이제 앱에서 [상태 다시 확인하기]를 누르거나 브라우저를 새로고침 해주세요.');

    } catch (e) {
        console.error('❌ 치명적 오류:', e.message);
    }
}

promoteToSuperAdmin();

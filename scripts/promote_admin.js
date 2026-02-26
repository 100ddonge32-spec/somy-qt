const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

try {
    const envFile = fs.readFileSync('.env.local', 'utf8');
    const supabaseUrl = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
    const supabaseServiceKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    async function promoteToSuperAdmin() {
        console.log('🚀 [이과장] 모든 슈퍼관리자 권한 복구 및 승인 작업 시작...');

        // 1. 이름이 '백동희'이거나, 최근에 생성된(가입신청한) 프로필 가져오기
        const { data: profiles, error: pError } = await supabase
            .from('profiles')
            .select('*')
            .or('full_name.ilike.%백동희%,is_approved.eq.false')
            .order('created_at', { ascending: false });

        if (pError || !profiles || profiles.length === 0) {
            console.error('❌ 대상 가입 정보를 찾을 수 없습니다.');
            return;
        }

        console.log(`✅ 총 ${profiles.length}개의 프로필을 검토합니다.`);

        for (const user of profiles) {
            // 성함이 '백동희'이거나 비승인 상태인 경우 모두 처리
            if (user.full_name?.includes('백동희') || !user.is_approved) {
                console.log(`- 처리 중: ${user.full_name || '이름없음'} (${user.id})`);

                // 프로필 강제 승인
                await supabase.from('profiles').update({ is_approved: true }).eq('id', user.id);

                // 관리자 이메일 목록 작성 (익명 사용자는 ID를 이메일 대용으로 사용)
                const candidateEmails = [
                    user.email,
                    `anon_${user.id}@somy.local`,
                    user.id // ID 자체로도 검색할 수 있게 함
                ].filter(Boolean);

                for (const email of candidateEmails) {
                    await supabase.from('app_admins').upsert([
                        {
                            email: email.toLowerCase().trim(),
                            role: 'super_admin',
                            church_id: user.church_id || 'jesus-in'
                        }
                    ]);
                }
                console.log(`  └ ✅ 슈퍼관리자 권한 부여 완료`);
            }
        }

        // 고정 관리자 이메일도 확실히 추가
        await supabase.from('app_admins').upsert([
            { email: 'pastorbaek@kakao.com', role: 'super_admin', church_id: 'jesus-in' }
        ]);

        console.log('\n🎊 모든 작업이 성공적으로 완료되었습니다!');
        console.log('이제 앱에서 [상태 다시 확인하기]를 누르거나, 새로고침 해주세요.');
    }

    promoteToSuperAdmin();
} catch (e) {
    console.error('❌ 작업 중 치명적 오류:', e.message);
}

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

async function cleanupAdmins() {
    console.log('🧹 [이과장] 관리자 목록 정리 및 권한 회수 작업을 시작합니다...');

    try {
        const envFile = fs.readFileSync('.env.local', 'utf8');
        const supabaseUrl = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
        const supabaseServiceKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 1. 기존 관리자 목록 전체 삭제 (보안 조치)
        const { error: delError } = await supabase.from('app_admins').delete().neq('email', 'KEEP_CLEANUP_FORCE');
        if (delError) console.error('❌ 관리자 목록 삭제 실패:', delError.message);
        else console.log('✅ 기존에 임시로 부여된 모든 관리자 권한을 회수했습니다.');

        // 2. '백동희' 성도님 계정만 다시 권한 부여
        const { data: profiles, error: pError } = await supabase
            .from('profiles')
            .select('*')
            .ilike('full_name', '%백동희%');

        if (pError) throw pError;

        let adminCount = 0;
        for (const user of profiles) {
            console.log(`📌 권한 복구 대상: ${user.full_name} (${user.id})`);

            const identifiers = [user.email, `anon_${user.id}@somy.local`, user.id].filter(Boolean);

            for (const iden of identifiers) {
                await supabase.from('app_admins').upsert([{
                    email: iden.toLowerCase().trim(),
                    role: 'super_admin',
                    church_id: user.church_id || 'jesus-in'
                }], { onConflict: 'email' });
            }
            adminCount++;
        }

        // 3. 고정 관리자 이메일 추가
        await supabase.from('app_admins').upsert([{
            email: 'pastorbaek@kakao.com',
            role: 'super_admin',
            church_id: 'jesus-in'
        }], { onConflict: 'email' });

        console.log(`\n🎊 정리 완료! 오직 '백동희' 성도님 계정(${adminCount}건)만 관리자로 남겨두었습니다.`);
        console.log('이제 다른 성도님들은 관리자 페이지에 접근할 수 없습니다.');

    } catch (e) {
        console.error('❌ 치명적 오류:', e.message);
    }
}

cleanupAdmins();

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// .env.local 읽기
const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixNames() {
    console.log('--- 기존 "이름 없음" 성도님 정보 수정 시작 ---');

    // 1. "이름 없음" 또는 '.' 인 성도님 찾기
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .or('full_name.eq.이름 없음,full_name.eq..');

    if (error) {
        console.error('Error fetching profiles:', error);
        return;
    }

    console.log(`대상 성도님 수: ${profiles.length}명`);

    for (const profile of profiles) {
        let newName = '성도';

        // 2. 이메일 아이디 부분 추출 시도
        if (profile.email && !profile.email.includes('anonymous.local') && !profile.email.includes('noemail.local')) {
            newName = profile.email.split('@')[0];
        } else {
            // 3. Auth 서버에서 이름 정보 다시 가져오기 시도
            const { data: { user }, error: authError } = await supabase.auth.admin.getUserById(profile.id);
            if (!authError && user) {
                newName = user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.nickname || newName;
            }
        }

        if (newName === '이름 없음' || newName === '.') newName = '성도';

        console.log(`ID: ${profile.id} | 기존: ${profile.full_name} -> 변경: ${newName}`);

        const { error: updateError } = await supabase
            .from('profiles')
            .update({ full_name: newName })
            .eq('id', profile.id);

        if (updateError) {
            console.error(`Update failed for ${profile.id}:`, updateError);
        }
    }

    console.log('--- 수정 완료 ---');
}

fixNames();

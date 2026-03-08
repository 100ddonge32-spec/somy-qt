
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

let supabaseUrl = "";
let serviceKey = "";

try {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const lines = envContent.split('\n');
    lines.forEach(line => {
        if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
        if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) serviceKey = line.split('=')[1].trim();
    });
} catch (e) {
    console.error("❌ .env.local 파일을 읽을 수 없습니다.");
}

const supabase = createClient(supabaseUrl, serviceKey);

async function restoreKakaoPosts() {
    const targetName = '김은영';
    const targetPhone = '01083730399';

    console.log(`\n🍑 [카카오 과거 기록 복원 작업] '${targetName}' 성도님 데이터를 추적합니다...`);

    // 1. 모든 관련 프로필(계정) 흔적 찾기 (이름, 전화번호 검색)
    const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .or(`full_name.ilike.%${targetName}%,phone.ilike.%${targetPhone}%,email.ilike.%${targetPhone}%`);

    if (!profiles || profiles.length === 0) {
        console.log("❌ 관련 프로필을 찾을 수 없습니다.");
        return;
    }

    console.log(`✅ 총 ${profiles.length}개의 계정 흔적을 발견했습니다.`);

    // 현재 사용 중인 계정(이메일이 정상이고 가장 최근 것)과 과거 카카오 계정 구분
    const activeProfile = profiles.find(p => p.email && !p.email.includes('@church.local') && !p.email.includes('kakao_')) || profiles[0];
    const allProfileIds = profiles.map(p => p.id);

    console.log(`   - 현재 활성 계정: ${activeProfile.full_name} (${activeProfile.email})`);
    console.log(`   - ID: ${activeProfile.id}`);

    // 2. 감사일기(thanksgiving_diaries)에서 발견된 모든 ID로 쓴 글 찾기
    console.log(`\n🔎 감사일기 테이블에서 과거 ID로 작성된 글을 스캔합니다...`);
    const { data: foundDiaries } = await supabase
        .from('thanksgiving_diaries')
        .select('*')
        .in('user_id', allProfileIds);

    const lostPosts = foundDiaries?.filter(d => d.user_id !== activeProfile.id) || [];

    if (lostPosts.length > 0) {
        console.log(`\n🎯 드디어 찾았습니다! 카카오 로그인 시 작성했던 '유실된 글' ${lostPosts.length}개를 발견했습니다.`);
        lostPosts.forEach(d => {
            console.log(`   - [과거 작성자명: ${d.user_name}] 내용: ${d.content.substring(0, 25)}... (날짜: ${d.created_at})`);
        });

        if (process.argv[2] === 'fix') {
            console.log(`\n🔄 복원을 시작합니다. 과거 글의 소유권을 현재 계정으로 통합합니다...`);
            for (const d of lostPosts) {
                const { error } = await supabase
                    .from('thanksgiving_diaries')
                    .update({
                        user_id: activeProfile.id,
                        user_name: targetName // 이름을 현재 정식 성함으로 통일
                    })
                    .eq('id', d.id);

                if (error) console.error(`   - 글 ${d.id} 복원 중 오류:`, error.message);
                else console.log(`   - [복원완료] "${d.content.substring(0, 15)}..."`);
            }
            console.log(`\n✨ 축하합니다! 모든 카카오 로그인 당시 글들이 현재 계정으로 복원되었습니다.`);
            console.log(`이제 앱의 '감사일기' 메뉴에서 김은영 성도님의 예전 글들을 모두 확인하실 수 있습니다.`);
        } else {
            console.log(`\n💡 이 글들을 지금 바로 복원하시려면 아래 명령어를 입력해주세요:`);
            console.log(`node check_posts.js fix`);
        }
    } else {
        console.log(`\n😭 안타깝게도 감사일기 테이블에는 과거 ID로 연결된 글이 여전히 발견되지 않습니다.`);
        console.log(`앞선 조사에서 발견된 '자유게시판'에 있는 10개의 글이 성도님이 찾으시는 그 글들일 가능성이 매우 높습니다.`);
        console.log(`만약 그 10개의 글을 '감사일기'로 옮기고 싶으시다면 말씀해주세요!`);
    }
}

restoreKakaoPosts();

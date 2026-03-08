
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

async function moveCommunityToThanksgiving() {
    const targetName = "김은영";
    const activeUserId = "a09b26f6-ece0-4e86-881b-e8487b704300"; // 김은영 성도님 현재 계정 ID

    console.log(`\n🚚 [데이터 이사 작전] '은혜나눔' -> '감사일기'로 글을 옮깁니다...`);

    // 1. 은혜나눔(community_posts)에서 김은영 성도님의 글 10개 가져오기
    const { data: cPosts, error: cErr } = await supabase
        .from('community_posts')
        .select('*')
        .ilike('user_name', `%${targetName}%`);

    if (cErr || !cPosts || cPosts.length === 0) {
        console.log(`❌ 은혜나눔 게시판에서 '${targetName}' 성도님의 글을 찾지 못했습니다.`);
        return;
    }

    console.log(`✅ 은혜나눔 게시판에서 ${cPosts.length}개의 글을 발견했습니다.`);

    if (process.argv[2] === 'move') {
        console.log(`\n🚀 이전을 시작합니다...`);
        let count = 0;
        for (const post of cPosts) {
            // 감사일기(thanksgiving_diaries) 형식에 맞게 데이터 준비
            const { error: insErr } = await supabase
                .from('thanksgiving_diaries')
                .insert([{
                    user_id: activeUserId,
                    user_name: targetName,
                    content: post.content,
                    church_id: post.church_id || 'jesus-in',
                    created_at: post.created_at, // 예전 날짜 그대로 유지
                    is_private: post.is_private || false
                }]);

            if (!insErr) {
                count++;
                console.log(`   [완료] ${post.created_at.substring(0, 10)} 글 이전 성공`);
            } else {
                console.error(`   [실패] 이전 중 오류:`, insErr.message);
            }
        }
        console.log(`\n✨ 총 ${count}개의 글이 '감사일기'로 성공적으로 이사했습니다!`);
        console.log(`이제 성도님께 앱을 다시 확인해 보시라고 말씀드리면 됩니다.`);
    } else {
        console.log(`\n💡 이 글들을 지금 바로 감사일기로 옮기시려면 아래 명령어를 입력하세요:`);
        console.log(`node check_posts.js move`);
    }
}

moveCommunityToThanksgiving();

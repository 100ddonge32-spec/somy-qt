const webpush = require('web-push');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// .env.local 파일 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BCpTn0SHIYSZzjST5xxL1Cv9svmlp3f9Xmvt9FSALBvo4QwLQCBlo_mu4ThoMHgINRmAk4c9sxwVwI2QtDyHr1I';
const vapidPrivate = process.env.VAPID_PRIVATE_KEY || 'LAAS6aJenIKYBShIGZsWVKhXNOMKwkuXvpf2NLCGZAI';

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ 에러: .env.local 파일에 Supabase 설정이 없습니다.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

webpush.setVapidDetails(
    'mailto:pastorbaek@kakao.com',
    vapidPublic,
    vapidPrivate
);

async function sendPushToAll(title, body) {
    console.log(`🚀 모든 성도에게 푸시 발송을 시작합니다...`);
    console.log(`📝 제목: ${title}`);
    console.log(`📝 내용: ${body}`);

    try {
        // 1. 모든 구독 정보 가져오기
        const { data: subs, error } = await supabase.from('push_subscriptions').select('*');

        if (error) throw error;
        if (!subs || subs.length === 0) {
            console.log('⚠️ 구독자가 한 명도 없습니다.');
            return;
        }

        console.log(`📢 총 ${subs.length}개의 기기가 등록되어 있습니다.`);

        const payload = JSON.stringify({
            title: title,
            body: body,
            url: '/'
        });

        // 2. 병렬 발송
        const results = await Promise.allSettled(
            subs.map(sub =>
                webpush.sendNotification(sub.subscription, payload)
                    .then(() => ({ success: true, userId: sub.user_id }))
                    .catch(err => ({ success: false, userId: sub.user_id, error: err.statusCode }))
            )
        );

        // 3. 결과 요약
        const successCount = results.filter(r => r.value && r.value.success).length;
        const failCount = results.length - successCount;

        console.log(`\n✅ 발송 완료!`);
        console.log(`- 성공: ${successCount}건`);
        console.log(`- 실패: ${failCount}건 (만료된 구독 등)`);

        // 실패한 구독(만료된 토큰 등)은 나중에 정리하면 좋습니다.
    } catch (err) {
        console.error('❌ 발송 중 치명적 에러:', err.message);
    }
}

// 터미널 인자 확인
const args = process.argv.slice(2);
if (args.length < 2) {
    console.log('\n📖 사용법: node scripts/push.js "전할 제목" "전할 내용"');
    console.log('예시: node scripts/push.js "샬롬!" "오늘 하루도 말씀으로 승리하세요!"\n');
} else {
    sendPushToAll(args[0], args[1]);
}

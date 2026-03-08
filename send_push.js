
const { createClient } = require('@supabase/supabase-js');
const webpush = require('web-push');
const fs = require('fs');

// 1. .env.local 에서 환경변수 읽기
let supabaseUrl = "";
let serviceKey = "";
let publicVapid = "BCpTn0SHIYSZzjST5xxL1Cv9svmlp3f9Xmvt9FSALBvo4QwLQCBlo_mu4ThoMHgINRmAk4c9sxwVwI2QtDyHr1I";
let privateVapid = "LAAS6aJenIKYBShIGZsWVKhXNOMKwkuXvpf2NLCGZAI";

try {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const lines = envContent.split('\n');
    lines.forEach(line => {
        if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
        if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) serviceKey = line.split('=')[1].trim();
        if (line.startsWith('NEXT_PUBLIC_VAPID_PUBLIC_KEY=')) publicVapid = line.split('=')[1].trim();
        if (line.startsWith('VAPID_PRIVATE_KEY=')) privateVapid = line.split('=')[1].trim();
    });
} catch (e) {
    console.warn("⚠️ .env.local 읽기 실패, 기본값 또는 하드코딩된 값을 시도합니다.");
}

if (!supabaseUrl || !serviceKey) {
    console.error("❌ 필수 설정(Supabase URL/Key)이 없습니다.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

webpush.setVapidDetails(
    'mailto:pastorbaek@kakao.com',
    publicVapid,
    privateVapid
);

async function sendPush() {
    const args = process.argv.slice(2);

    if (args.length < 2) {
        console.log(`
🚀 [Somy Push 서비스 터미널 도구]
        
사용법:
  node send_push.js --all "제목" "내용"
  node send_push.js --name "성도이름" "제목" "내용"
  node send_push.js --phone "전화번호" "제목" "내용"
  node send_push.js --email "이메일" "제목" "내용"
  node send_push.js --id "유저ID" "제목" "내용"

예시:
  node send_push.js --name "김은영" "안녕하세요" "묵상 글이 복합되었습니다!"
        `);
        return;
    }

    const mode = args[0];
    let title = "";
    let body = "";
    let targetValue = "";

    if (mode === '--all') {
        title = args[1];
        body = args[2] || "";
    } else {
        targetValue = args[1];
        title = args[2];
        body = args[3] || "";
    }

    if (!title) {
        console.error("❌ 메시지 제목을 입력해주세요.");
        return;
    }

    console.log(`\n🔔 푸시 알림 발송 준비 중...`);
    console.log(`📡 대상: ${mode === '--all' ? '전체 사용자' : targetValue}`);
    console.log(`📝 제목: ${title}`);
    console.log(`💬 내용: ${body}`);

    let userIds = [];

    if (mode === '--all') {
        const { data: profiles } = await supabase.from('profiles').select('id').eq('is_approved', true);
        userIds = profiles.map(p => p.id);
    } else if (mode === '--id') {
        userIds = [targetValue];
    } else if (mode === '--name') {
        const { data: profiles } = await supabase.from('profiles').select('id').ilike('full_name', `%${targetValue}%`);
        userIds = profiles.map(p => p.id);
    } else if (mode === '--phone') {
        const cleanPhone = targetValue.replace(/[^0-9]/g, '');
        const { data: profiles } = await supabase.from('profiles').select('id').ilike('phone', `%${cleanPhone}%`);
        userIds = profiles.map(p => p.id);
    } else if (mode === '--email') {
        const { data: profiles } = await supabase.from('profiles').select('id').eq('email', targetValue);
        userIds = profiles.map(p => p.id);
    }

    if (userIds.length === 0) {
        console.error("❌ 해당하는 사용자를 찾을 수 없습니다.");
        return;
    }

    const { data: subs, error: subErr } = await supabase
        .from('push_subscriptions')
        .select('user_id, subscription')
        .in('user_id', userIds);

    if (subErr) {
        console.error("❌ 구독 정보 조회 오류:", subErr);
        return;
    }

    if (!subs || subs.length === 0) {
        console.error("❌ 알림 수신을 동의(구독)한 사용자가 없습니다. (기기 알림 활성화 필요)");
        return;
    }

    console.log(`🚀 ${subs.length}개의 기기에 발송을 시작합니다...`);

    let successCount = 0;
    let failCount = 0;

    for (const s of subs) {
        try {
            await webpush.sendNotification(
                s.subscription,
                JSON.stringify({
                    title: title,
                    body: body,
                    url: '/?view=home'
                })
            );
            successCount++;
        } catch (err) {
            failCount++;
            if (err.statusCode === 410 || err.statusCode === 404) {
                console.log(`🚮 만료된 구독 정보 삭제 중... (User: ${s.user_id})`);
                await supabase.from('push_subscriptions').delete().eq('user_id', s.user_id);
            } else {
                console.error(`❌ 발송 실패 (User: ${s.user_id}):`, err.message);
            }
        }
    }

    console.log(`\n✨ 발송 완료!`);
    console.log(`✅ 성공: ${successCount}`);
    console.log(`❌ 실패: ${failCount}`);
}

sendPush();

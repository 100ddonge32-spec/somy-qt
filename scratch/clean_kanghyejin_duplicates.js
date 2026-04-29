
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

async function cleanDuplicates() {
    const idsToDelete = [
        '9b2a1217-0c29-45a8-bf08-c1319a638686',
        '4b3d8470-317e-4fe3-b5e4-f17148ef6749'
    ];
    
    console.log(`\n🧹 중복 등록된 감사일기를 삭제합니다...`);

    const { error } = await supabase
        .from('thanksgiving_diaries')
        .delete()
        .in('id', idsToDelete);

    if (error) {
        console.error("❌ 삭제 실패:", error.message);
    } else {
        console.log("✅ 중복 글 삭제 완료!");
    }
}

cleanDuplicates();


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

async function checkKangHyeJin() {
    const targetName = "강혜진";
    
    console.log(`\n🔍 '${targetName}' 성도님의 글을 검색합니다...`);

    // community_posts 검색
    const { data: cPosts, error: cErr } = await supabase
        .from('community_posts')
        .select('*')
        .ilike('user_name', `%${targetName}%`)
        .order('created_at', { ascending: false })
        .limit(10);

    if (cPosts && cPosts.length > 0) {
        console.log(`\n--- community_posts (${cPosts.length}개 발견) ---`);
        cPosts.forEach(p => console.log(`ID: ${p.id} | Name: ${p.user_name} | Created: ${p.created_at} | Content: ${p.content.substring(0, 20)}...`));
    }

    // thanksgiving_diaries 검색
    const { data: tPosts, error: tErr } = await supabase
        .from('thanksgiving_diaries')
        .select('*')
        .ilike('user_name', `%${targetName}%`)
        .order('created_at', { ascending: false })
        .limit(10);

    if (tPosts && tPosts.length > 0) {
        console.log(`\n--- thanksgiving_diaries (${tPosts.length}개 발견) ---`);
        tPosts.forEach(p => console.log(`ID: ${p.id} | Name: ${p.user_name} | Created: ${p.created_at} | Content: ${p.content.substring(0, 20)}...`));
    }
    
    // gallery 검색 (혹시 모르니)
    const { data: gPosts, error: gErr } = await supabase
        .from('gallery_posts')
        .select('*')
        .ilike('user_name', `%${targetName}%`)
        .order('created_at', { ascending: false })
        .limit(10);

    if (gPosts && gPosts.length > 0) {
        console.log(`\n--- gallery_posts (${gPosts.length}개 발견) ---`);
        gPosts.forEach(p => console.log(`ID: ${p.id} | Name: ${p.user_name} | Created: ${p.created_at} | Content: ${p.content ? p.content.substring(0, 20) : 'N/A'}...`));
    }
}

checkKangHyeJin();

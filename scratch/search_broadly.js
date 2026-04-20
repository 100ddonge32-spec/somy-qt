const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        envVars[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
    }
});

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

async function searchBroadly() {
    console.log('Searching for "사랑방" across all tables and logs...');

    // 1. All activity logs with "사랑방"
    const { data: logs } = await supabase
        .from('activity_logs')
        .select('*')
        .ilike('details', '%사랑방%');

    console.log('\n--- Activity Logs with "사랑방" ---');
    logs.forEach(l => console.log(`[${l.id}] ${l.created_at} (${l.activity_type}): ${l.details}`));

    // 2. All community posts with "사랑방"
    const { data: posts } = await supabase
        .from('community_posts')
        .select('*')
        .ilike('content', '%사랑방%');

    console.log('\n--- Community Posts with "사랑방" ---');
    posts.forEach(p => console.log(`[${p.id}] ${p.created_at}: ${p.content}`));

    // 3. All thanksgiving diaries with "사랑방"
    const { data: diaries } = await supabase
        .from('thanksgiving_diaries')
        .select('*')
        .ilike('content', '%사랑방%');

    console.log('\n--- Thanksgiving Diaries with "사랑방" ---');
    diaries.forEach(d => console.log(`[${d.id}] ${d.created_at}: ${d.content}`));
}

searchBroadly();

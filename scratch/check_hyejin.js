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

async function findFullContent() {
    console.log('Searching for Kang Hye-jin (강혜진) entries on 2026-04-19...');

    // 1. Check thanksgiving_diaries
    const { data: diaries, error: diaryErr } = await supabase
        .from('thanksgiving_diaries')
        .select('*')
        .eq('user_name', '강혜진')
        .gte('created_at', '2026-04-19T00:00:00')
        .lte('created_at', '2026-04-19T23:59:59');

    console.log('\n--- Thanksgiving Diaries ---');
    if (diaryErr) console.error(diaryErr);
    else diaries.forEach(d => console.log(`[${d.id}] ${d.created_at}: ${d.content}`));

    // 2. Check activity_logs
    const { data: logs, error: logErr } = await supabase
        .from('activity_logs')
        .select('*')
        .ilike('details', '%사랑방%')
        .gte('created_at', '2026-04-19T00:00:00')
        .lte('created_at', '2026-04-19T23:59:59');

    console.log('\n--- Activity Logs ---');
    if (logErr) console.error(logErr);
    else logs.forEach(l => console.log(`[${l.id}] ${l.created_at}: ${l.details}`));

    // 3. Check community_posts (just in case)
    const { data: posts, error: postErr } = await supabase
        .from('community_posts')
        .select('*')
        .eq('user_name', '강혜진')
        .gte('created_at', '2026-04-19T00:00:00')
        .lte('created_at', '2026-04-19T23:59:59');

    console.log('\n--- Community Posts ---');
    if (postErr) console.error(postErr);
    else posts.forEach(p => console.log(`[${p.id}] ${p.created_at}: ${p.content}`));
}

findFullContent();

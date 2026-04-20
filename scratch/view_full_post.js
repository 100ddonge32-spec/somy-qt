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

async function viewFullCommunityPost() {
    console.log('Viewing full community post for 강혜진 on April 19...');
    const { data } = await supabase
        .from('community_posts')
        .select('*')
        .eq('user_name', '강혜진')
        .gte('created_at', '2026-04-19T00:00:00')
        .lte('created_at', '2026-04-19T23:59:59');
    
    if (data && data.length > 0) {
        console.log(`Content: ${data[0].content}`);
    } else {
        console.log('Post not found.');
    }
}

viewFullCommunityPost();

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

async function searchAllHyejinPosts() {
    console.log('Searching for ALL posts by 강혜진...');
    
    // Check community_posts
    const { data: posts1 } = await supabase
        .from('community_posts')
        .select('*')
        .eq('user_name', '강혜진');
    
    console.log('\n--- Community Posts ---');
    posts1.forEach(p => console.log(`[${p.created_at}] [Len: ${p.content.length}] ${p.content.slice(0, 100)}...`));

    // Check thanksgiving_diaries
    const { data: posts2 } = await supabase
        .from('thanksgiving_diaries')
        .select('*')
        .eq('user_name', '강혜진');
    
    console.log('\n--- Thanksgiving Diaries ---');
    posts2.forEach(p => console.log(`[${p.created_at}] [Len: ${p.content.length}] ${p.content.slice(0, 100)}...`));
}

searchAllHyejinPosts();

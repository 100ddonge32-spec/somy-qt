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

async function searchComments() {
    const snippet = '오랜만의 주일';
    console.log(`Searching for snippet "${snippet}" in ALL comments...`);
    
    const { data: c1 } = await supabase.from('community_comments').select('*').ilike('content', `%${snippet}%`);
    const { data: c2 } = await supabase.from('thanksgiving_comments').select('*').ilike('content', `%${snippet}%`);
    
    if (c1 && c1.length > 0) c1.forEach(c => console.log(`[Community Comment] ${c.created_at}: ${c.content}`));
    if (c2 && c2.length > 0) c2.forEach(c => console.log(`[Thanks Comment] ${c.created_at}: ${c.content}`));
}

searchComments();

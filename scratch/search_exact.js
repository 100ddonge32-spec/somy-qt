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

async function searchExact() {
    const snippet = '오랜만의 주일';
    console.log(`Searching for snippet "${snippet}"...`);
    
    const tables = ['community_posts', 'thanksgiving_diaries', 'activity_logs', 'community_comments', 'thanksgiving_comments'];
    for (const table of tables) {
        const { data } = await supabase
            .from(table)
            .select('*')
            .ilike(table === 'activity_logs' ? 'details' : 'content', `%${snippet}%`);
        
        if (data && data.length > 0) {
            console.log(`\n--- Table: ${table} ---`);
            data.forEach(d => {
                const text = d.content || d.details;
                console.log(`[ID: ${d.id}] [Length: ${text?.length}] [Date: ${d.created_at}] Content: ${text}`);
            });
        }
    }
}

searchExact();

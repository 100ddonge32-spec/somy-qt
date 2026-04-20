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

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY); // Use anon key for broad search? No, service role.

const adminSupabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

async function deepSearch() {
    const tables = [
        'community_posts', 'thanksgiving_diaries', 'activity_logs', 
        'community_comments', 'thanksgiving_comments', 'gallery_posts',
        'notifications', 'profiles', 'church_settings', 'qt_completions'
    ];
    const snippet = '사랑방';

    console.log(`Deep searching for "${snippet}"...`);

    for (const table of tables) {
        try {
            const { data, error } = await adminSupabase.from(table).select('*').limit(1000);
            if (error) {
                console.log(`Skipping ${table}: ${error.message}`);
                continue;
            }
            if (!data) continue;

            data.forEach(row => {
                const rowStr = JSON.stringify(row);
                if (rowStr.includes(snippet)) {
                    console.log(`\nMatch found in table [${table}]:`);
                    console.log(rowStr);
                }
            });
        } catch (e) {
            console.log(`Error reading ${table}`);
        }
    }
}

deepSearch();

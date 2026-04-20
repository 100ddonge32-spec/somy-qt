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

async function searchAllLogs() {
    const snippet = '오랜만의 주일';
    console.log(`Searching for snippet "${snippet}" in ALL logs...`);
    
    const { data } = await supabase
        .from('activity_logs')
        .select('*')
        .ilike('details', `%${snippet}%`);
    
    if (data && data.length > 0) {
        data.forEach(l => {
            console.log(`[${l.created_at}] [${l.activity_type}] Details: ${l.details}`);
        });
    } else {
        console.log('No matching logs.');
    }
}

searchAllLogs();

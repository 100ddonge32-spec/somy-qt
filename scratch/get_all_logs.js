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

async function getAllLogs() {
    const userId = 'a92d612d-943a-4d4c-928f-6c8c7fc51ec4';
    console.log(`Fetching all logs for user ${userId} on 2026-04-19...`);
    
    const { data } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', '2026-04-19T00:00:00')
        .lte('created_at', '2026-04-19T23:59:59')
        .order('created_at', { ascending: true });
    
    if (data && data.length > 0) {
        data.forEach(l => {
            console.log(`[${l.created_at}] [${l.activity_type}] Details: ${l.details}`);
        });
    } else {
        console.log('No logs found.');
    }
}

getAllLogs();

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

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
    const { data: profiles } = await supabase.from('profiles').select('*').eq('full_name', '백동희');
    console.log("Profiles for 백동희:");
    console.log(JSON.stringify(profiles, null, 2));

    const { data: admins } = await supabase.from('app_admins').select('*');
    console.log("App Admins:");
    console.log(JSON.stringify(admins, null, 2));
}

run();

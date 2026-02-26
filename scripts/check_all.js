const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

async function run() {
    try {
        const envFile = fs.readFileSync('.env.local', 'utf8');
        const supabaseUrl = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
        const supabaseServiceKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        console.log('--- Checking ALL Profiles ---');
        const { data: profiles } = await supabase.from('profiles').select('*').limit(20);
        console.log(JSON.stringify(profiles, null, 2));

        console.log('\n--- Checking ALL Admins ---');
        const { data: admins } = await supabase.from('app_admins').select('*');
        console.log(JSON.stringify(admins, null, 2));

    } catch (e) {
        console.error('Error:', e.message);
    }
}

run();

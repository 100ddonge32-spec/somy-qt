const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

async function run() {
    try {
        const envFile = fs.readFileSync('.env.local', 'utf8');
        const supabaseUrl = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
        const supabaseServiceKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        console.log('--- app_admins Table ---');
        const { data: admins, error: aError } = await supabase.from('app_admins').select('*');
        if (aError) console.error('Admin Error:', aError.message);
        else console.log(JSON.stringify(admins, null, 2));

        console.log('\n--- profiles Table (백동희) ---');
        const { data: profiles, error: pError } = await supabase.from('profiles').select('*').ilike('full_name', '%백동희%').order('created_at', { ascending: false });
        if (pError) console.error('Profile Error:', pError.message);
        else console.log(JSON.stringify(profiles, null, 2));

    } catch (e) {
        console.error('Fatal Error:', e.message);
    }
}

run();

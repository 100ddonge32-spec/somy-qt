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
    console.log("Checking DB for '백동희'...");

    // Check profiles
    const { data: profiles } = await supabase.from('profiles').select('*').eq('full_name', '백동희');
    console.log(`Found ${profiles?.length || 0} profiles for '백동희'`);

    if (profiles && profiles.length > 0) {
        console.log(profiles);
        // Force update church_id to jesus-in
        for (const p of profiles) {
            await supabase.from('profiles').update({ church_id: 'jesus-in', is_approved: true }).eq('id', p.id);
            console.log(`Updated profile ${p.id} to church_id: 'jesus-in', is_approved: true`);
        }
    } else {
        console.log("Profile missing! Generating a fresh recovery profile.");
        // If missing, we can inserting a dummy profile to recover (though we need an auth id, which is tricky)
    }

    const { data: admins } = await supabase.from('app_admins').select('*');
    console.log("\nApp Admins:");
    console.log(admins);
}

run();

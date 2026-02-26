const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function diagnose() {
    const profileId = '6dd73e5c-fca1-4d20-b922-22a69de7d2ff';
    console.log(`Checking profile ID: ${profileId}`);

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', profileId).single();
    if (!profile) {
        console.log('Profile not found.');
    } else {
        console.log('Profile found:', profile.full_name, profile.email);
    }

    console.log('\nChecking if this ID exists in auth.users...');
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(profileId);

    if (authError) {
        console.log('Auth user not found or error:', authError.message);
    } else {
        console.log('Auth user found:', authUser.user.email);
    }
}

diagnose();

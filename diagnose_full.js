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
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', profileId).single();
    console.log(JSON.stringify(profile, null, 2));
}

diagnose();

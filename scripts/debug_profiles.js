const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseServiceKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkProfiles() {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('full_name', '%백동희%')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error:', error.message);
        return;
    }

    console.log('--- 백동희 프로필 목록 ---');
    console.log(JSON.stringify(data, null, 2));
}

checkProfiles();

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAdmins() {
    const { data: admins, error } = await supabase.from('app_admins').select('*');
    if (error) {
        console.error('Error fetching admins:', error);
        return;
    }
    console.log('--- Current Admins ---');
    console.log(JSON.stringify(admins, null, 2));

    const { data: profiles, error: pError } = await supabase.from('profiles').select('id, full_name, email, phone').limit(10);
    console.log('\n--- Recent Profiles (Sample) ---');
    console.log(JSON.stringify(profiles, null, 2));
}

checkAdmins();

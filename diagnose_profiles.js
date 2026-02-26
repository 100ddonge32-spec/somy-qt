const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local manually
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        env[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
});

const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
);

async function diagnose() {
    const name = '백동희';
    console.log(`--- Diagnosing profiles for "${name}" ---`);

    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('full_name', `%${name}%`);

    if (error) {
        console.error('Error fetching profiles:', error);
        return;
    }

    console.log(`Found ${profiles.length} profile(s):`);
    profiles.forEach((p, i) => {
        console.log(`[${i + 1}] ID: ${p.id}`);
        console.log(`    Email: ${p.email}`);
        console.log(`    Phone: ${p.phone}`);
        console.log(`    Rank: ${p.church_rank}`);
        console.log(`    Approved: ${p.is_approved}`);
        console.log(`    Created: ${p.created_at}`);
        console.log(`    MemberNo: ${p.member_no}`);
        console.log('---------------------------');
    });
}

diagnose();

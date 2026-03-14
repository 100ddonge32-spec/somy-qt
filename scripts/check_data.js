
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
    console.log("Checking profiles for '박선민'...");
    const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_name', '박선민');
    
    if (pError) console.error(pError);
    else console.log("Profiles matching '박선민':", JSON.stringify(profiles, null, 2));

    console.log("\nChecking '예수인교회' profiles...");
    const { data: jesusInProfiles, error: jiError } = await supabase
        .from('profiles')
        .select('id, user_name, church_id')
        .in('church_id', ['jesus-in', '예수인교회']);
    
    if (jiError) console.error(jiError);
    else {
        console.log("JesusIn Profiles Count:", jesusInProfiles.length);
        console.log("JesusIn Profile Names:", jesusInProfiles.map(p => p.user_name).sort());
    }

    console.log("\nChecking QT completions for Yesuin Church users since March 1st...");
    const { data: completions, error: cError } = await supabase
        .from('qt_completions')
        .select('user_name, completed_date')
        .gte('completed_date', '2026-03-01')
        .order('completed_date', { ascending: true });

    if (cError) console.error(cError);
    else {
        const jesusInNames = jesusInProfiles.map(p => p.user_name);
        const jesusInCompletions = completions.filter(c => jesusInNames.includes(c.user_name));

        console.log("Completions for Yesuin Church members (by name match):", jesusInCompletions.length);
        const counts = {};
        jesusInCompletions.forEach(c => {
            counts[c.user_name] = (counts[c.user_name] || 0) + 1;
        });
        console.log("Counts from DB:", counts);
    }
}

check();

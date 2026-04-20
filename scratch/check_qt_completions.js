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

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

async function checkQtCompletions() {
    const userId = 'a92d612d-943a-4d4c-928f-6c8c7fc51ec4'; // current ID
    const oldUserId = 'b908f5f5-906e-4f35-8499-d2023938f0cc'; // old ID
    
    console.log('Checking qt_completions for April 19...');
    
    const { data } = await supabase
        .from('qt_completions')
        .select('*')
        .gte('completed_date', '2026-04-19')
        .lte('completed_date', '2026-04-19');
    
    if (data && data.length > 0) {
        data.forEach(d => {
            if (d.user_name === '강혜진' || d.user_id === userId || d.user_id === oldUserId) {
                console.log(`[User: ${d.user_name}] [ID: ${d.user_id}] Answers:`, JSON.stringify(d.answers, null, 2));
            }
        });
    } else {
        console.log('No completions found.');
    }
}

checkQtCompletions();

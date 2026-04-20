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

async function searchGalleryV2() {
    const snippet = '사랑방';
    const { data } = await supabase
        .from('gallery_posts')
        .select('*')
        .ilike('description', `%${snippet}%`);
    
    if (data && data.length > 0) {
        data.forEach(d => {
            console.log(`[Date: ${d.created_at}] Description: ${d.description}`);
        });
    } else {
        console.log('No matching gallery posts.');
    }
}

searchGalleryV2();

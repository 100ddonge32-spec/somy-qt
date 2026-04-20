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

async function searchGallery() {
    const snippet = '사랑방';
    console.log(`Searching for snippet "${snippet}" in gallery_posts...`);
    
    const { data, error } = await supabase
        .from('gallery_posts')
        .select('*')
        .ilike('content', `%${snippet}%`);
    
    if (error) console.error(error);
    if (data && data.length > 0) {
        data.forEach(d => {
            console.log(`[ID: ${d.id}] [Date: ${d.created_at}] Content: ${d.content}`);
        });
    } else {
        console.log('No gallery posts found.');
    }
}

searchGallery();

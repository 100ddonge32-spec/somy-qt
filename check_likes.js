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

const supabaseAdmin = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
    console.log("=== CHECKING '백동희' TRACES ===");

    // 1. Check Profiles
    const { data: profiles } = await supabaseAdmin.from('profiles').select('id, full_name, created_at, phone').eq('full_name', '백동희');
    console.log("Profiles:");
    console.table(profiles);

    // 2. Check Likes in community_posts
    const { data: posts } = await supabaseAdmin.from('community_posts').select('id, content, liker_ids').not('liker_ids', 'is', null);

    let likesByProfile = {};
    if (profiles) {
        profiles.forEach(p => likesByProfile[p.id] = 0);
    }

    if (posts) {
        posts.forEach(post => {
            if (post.liker_ids) {
                post.liker_ids.forEach(id => {
                    if (likesByProfile[id] !== undefined) {
                        likesByProfile[id]++;
                    }
                });
            }
        });
    }

    console.log("Likes found for each '백동희' ID:");
    console.table(likesByProfile);

    // 3. Check Authentication Users
    // NOTE: This usually requires specific access to auth schema or admin api, we'll try admin API
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    if (users) {
        const bd_users = users.filter(u => u.user_metadata && (u.user_metadata.full_name === '백동희' || u.user_metadata.name === '백동희'));
        console.log("Auth Users:");
        console.table(bd_users.map(u => ({ id: u.id, email: u.email, name: u.user_metadata.full_name || u.user_metadata.name })));
    }
}

run();

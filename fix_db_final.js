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
    console.log("Checking DB for duplicate '백동희'...");

    // Fetch all profiles for 백동희
    const { data: profiles } = await supabaseAdmin.from('profiles').select('*').eq('full_name', '백동희').order('created_at', { ascending: true });

    if (!profiles || profiles.length === 0) {
        console.log("No profiles found.");
        return;
    }

    console.log(`Found ${profiles.length} profiles for '백동희'.`);

    // Choose the first one (or the one with the most data) as the target
    const targetProfile = profiles[profiles.length - 1]; // Let's pick the latest one assuming it's the one they are logging in with, or first? Let's pick the latest.
    const targetUserId = targetProfile.id;
    console.log(`Target profile ID: ${targetUserId}`);

    // Merge data from other profiles to target profile
    for (const p of profiles) {
        if (p.id !== targetUserId) {
            console.log(`Merging ${p.id} into ${targetUserId}`);

            // 1. 소유권 이전
            console.log(`Transferring ownership for ${p.id}...`);
            await supabaseAdmin.from('thanksgiving_diaries').update({ user_id: targetUserId }).eq('user_id', p.id);
            await supabaseAdmin.from('thanksgiving_comments').update({ user_id: targetUserId }).eq('user_id', p.id);
            await supabaseAdmin.from('community_posts').update({ user_id: targetUserId }).eq('user_id', p.id);
            await supabaseAdmin.from('community_comments').update({ user_id: targetUserId }).eq('user_id', p.id);
            await supabaseAdmin.from('notifications').update({ user_id: targetUserId }).eq('user_id', p.id);
            await supabaseAdmin.from('qt_completions').update({ user_id: targetUserId }).eq('user_id', p.id);
            await supabaseAdmin.from('counseling_requests').update({ user_id: targetUserId }).eq('user_id', p.id);
            await supabaseAdmin.from('push_subscriptions').update({ user_id: targetUserId }).eq('user_id', p.id);

            // 2. 좋아요 배열 치환
            for (const table of ['community_posts', 'thanksgiving_diaries']) {
                const { data: posts } = await supabaseAdmin.from(table).select('id, liker_ids').contains('liker_ids', [p.id]);
                if (posts && posts.length > 0) {
                    for (const post of posts) {
                        if (post.liker_ids) {
                            const newLikes = Array.from(new Set(post.liker_ids.map(id => id === p.id ? targetUserId : id)));
                            await supabaseAdmin.from(table).update({ liker_ids: newLikes }).eq('id', post.id);
                        }
                    }
                }
            }

            // 3. Delete the old profile
            await supabaseAdmin.from('profiles').delete().eq('id', p.id);
            console.log(`Deleted old profile ${p.id}`);
        }
    }

    // Also check for '동희'
    const { data: dongheeProfiles } = await supabaseAdmin.from('profiles').select('*').eq('full_name', '동희');
    if (dongheeProfiles && dongheeProfiles.length > 0) {
        console.log(`Found ${dongheeProfiles.length} profiles for '동희'. Merging into target.`);
        for (const p of dongheeProfiles) {
            if (p.id !== targetUserId) {
                console.log(`Merging ${p.id} into ${targetUserId}`);
                await supabaseAdmin.from('thanksgiving_diaries').update({ user_id: targetUserId }).eq('user_id', p.id);
                await supabaseAdmin.from('thanksgiving_comments').update({ user_id: targetUserId }).eq('user_id', p.id);
                await supabaseAdmin.from('community_posts').update({ user_id: targetUserId }).eq('user_id', p.id);
                await supabaseAdmin.from('community_comments').update({ user_id: targetUserId }).eq('user_id', p.id);
                await supabaseAdmin.from('notifications').update({ user_id: targetUserId }).eq('user_id', p.id);
                await supabaseAdmin.from('qt_completions').update({ user_id: targetUserId }).eq('user_id', p.id);
                await supabaseAdmin.from('counseling_requests').update({ user_id: targetUserId }).eq('user_id', p.id);
                await supabaseAdmin.from('profiles').delete().eq('id', p.id);
            }
        }
    }

    console.log("Cleanup complete!");
}

run();

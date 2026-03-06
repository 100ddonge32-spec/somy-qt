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
    console.log("=== LIKES CLEANUP & DEDUPLICATION ===");

    // Fetch all valid profile IDs
    const { data: profiles } = await supabaseAdmin.from('profiles').select('id');
    const validIds = new Set(profiles.map(p => p.id));
    console.log(`Loaded ${validIds.size} valid profile IDs.`);

    for (const table of ['community_posts', 'thanksgiving_diaries', 'board_posts']) {
        console.log(`\nChecking table: ${table}...`);

        // Use try-catch because board_posts might not exist or might not have liker_ids
        try {
            const { data: records, error } = await supabaseAdmin.from(table).select('id, liker_ids');

            if (error) {
                console.log(`Skipping ${table}: ${error.message}`);
                continue;
            }

            if (!records) continue;

            let updatedCount = 0;
            for (const record of records) {
                if (record.liker_ids && Array.isArray(record.liker_ids) && record.liker_ids.length > 0) {
                    const originalLength = record.liker_ids.length;

                    // Remove duplicates and keep only valid IDs
                    const cleanedLikes = Array.from(new Set(record.liker_ids)).filter(id => validIds.has(id));

                    if (cleanedLikes.length !== originalLength) {
                        await supabaseAdmin.from(table).update({ liker_ids: cleanedLikes }).eq('id', record.id);
                        updatedCount++;
                    }
                }
            }
            console.log(`Updated ${updatedCount} rows in ${table} to remove dead/duplicate likes.`);
        } catch (e) {
            console.log(`Error checking ${table}: ${e.message}`);
        }
    }

    console.log("\nCleanup Complete!");
}

run();

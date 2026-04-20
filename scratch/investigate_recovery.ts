import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function findSnippetFull() {
    const snippet = '상황이 권사님의 기쁨이 되길';
    console.log(`Searching for snippet "${snippet}"...`);
    
    const tables = ['community_posts', 'thanksgiving_diaries', 'activity_logs', 'gallery_posts', 'community_comments', 'thanksgiving_comments'];
    for (const table of tables) {
        const { data } = await supabaseAdmin
            .from(table)
            .select('*')
            .ilike('content', `%${snippet}%`);
        
        if (data && data.length > 0) {
            console.log(`--- Table: ${table} ---`);
            data.forEach(d => {
                const text = d.content || d.details;
                console.log(`[Length: ${text?.length}] Content: ${text}`);
            });
        }
    }
}

findSnippetFull();

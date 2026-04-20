import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function recoverDiaries() {
    const currentUserId = 'a92d612d-943a-4d4c-928f-6c8c7fc51ec4';
    const oldIds = ['b908f5f5-906e-4f35-8499-d2023938f0cc', '3b90ae29-2d2f-48a0-b424-8bd1f863acf9'];
    const allIds = [...oldIds, currentUserId];

    console.log('Fetching logs to restore...');
    const { data: logs } = await supabaseAdmin
        .from('activity_logs')
        .select('*')
        .eq('activity_type', 'THANKS_DIARY')
        .in('user_id', allIds);
    
    if (!logs || logs.length === 0) {
        console.log('No logs found to restore.');
        return;
    }

    console.log(`Found ${logs.length} logs. Checking for duplicates in thanksgiving_diaries...`);
    
    // To be safe, avoid inserting if same content on same date exists
    let restoredCount = 0;
    for (const log of logs) {
        const { data: existing } = await supabaseAdmin
            .from('thanksgiving_diaries')
            .select('id')
            .eq('user_id', currentUserId)
            .eq('content', log.details)
            .limit(1);
        
        if (!existing || existing.length === 0) {
            console.log(`Restoring log from ${log.created_at}: ${log.details?.slice(0, 30)}...`);
            const { error } = await supabaseAdmin.from('thanksgiving_diaries').insert([{
                user_id: currentUserId,
                user_name: '강혜진',
                avatar_url: null,
                content: log.details,
                church_id: 'jesus-in',
                is_private: false,
                created_at: log.created_at
            }]);
            if (error) console.error('Error restoring:', error);
            else restoredCount++;
        }
    }

    console.log(`Successfully restored ${restoredCount} diaries.`);
}

recoverDiaries();

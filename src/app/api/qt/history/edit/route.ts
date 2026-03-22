import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
    try {
        const { action, user_id, date, answers, reflection, user_name, church_id } = await req.json();

        if (!user_id || !date || !action) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (action === 'delete') {
            // Delete qt_completions
            const { error: qtError } = await supabaseAdmin
                .from('qt_completions')
                .delete()
                .eq('user_id', user_id)
                .eq('completed_date', date);
            
            if (qtError) throw qtError;

            // Delete community_posts for this date and user
            // 1. Fetch community_posts to check the dates
            const startDate = `${date}T00:00:00.000Z`;
            const endDate = `${date}T23:59:59.999Z`;

            // Note: Since timezone is UTC in DB, and date is KST, we just delete posts by user_id that are is_qt=true and roughly matching.
            // Better to delete where is_qt=true and user_id=user_id and created_at between startDate and endDate
            // Actually, querying all is_qt=true for user and filtering KST date is safer
            const { data: posts } = await supabaseAdmin.from('community_posts').select('id, created_at').eq('user_id', user_id).eq('is_qt', true);
            
            if (posts) {
                const postsToDelete = posts.filter(p => {
                    const kstDate = new Date(new Date(p.created_at).getTime() + 9 * 60 * 60 * 1000);
                    return kstDate.toISOString().split('T')[0] === date;
                });
                
                if (postsToDelete.length > 0) {
                    const ids = postsToDelete.map(p => p.id);
                    await supabaseAdmin.from('community_posts').delete().in('id', ids);
                }
            }
            return NextResponse.json({ success: true });
        }

        if (action === 'update') {
            // Update qt_completions
            const { error: updateError } = await supabaseAdmin
                .from('qt_completions')
                .update({ answers })
                .eq('user_id', user_id)
                .eq('completed_date', date);
            
            if (updateError) throw updateError;

            // Update community_posts
            if (reflection !== undefined) {
                const { data: posts } = await supabaseAdmin.from('community_posts').select('id, created_at').eq('user_id', user_id).eq('is_qt', true);
                if (posts) {
                    const postToUpdate = posts.find(p => {
                        const kstDate = new Date(new Date(p.created_at).getTime() + 9 * 60 * 60 * 1000);
                        return kstDate.toISOString().split('T')[0] === date;
                    });

                    if (postToUpdate) {
                        if (reflection.trim() === '') {
                            await supabaseAdmin.from('community_posts').delete().eq('id', postToUpdate.id);
                        } else {
                            await supabaseAdmin.from('community_posts').update({ content: reflection }).eq('id', postToUpdate.id);
                        }
                    } else if (reflection.trim() !== '') {
                        // Create new post if it didn't exist
                        await supabaseAdmin.from('community_posts').insert({
                            user_id,
                            user_name: user_name || '성도',
                            content: reflection,
                            church_id: church_id || 'jesus-in',
                            is_qt: true
                        });
                    }
                }
            }
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

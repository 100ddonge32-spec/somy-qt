import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export type ActivityType = 'LOGIN' | 'POST_CREATED' | 'COMMENT_CREATED' | 'QT_COMPLETED' | 'THANKS_DIARY' | 'MEMBER_APPROVED' | 'ADMIN_MODIFIED';

export async function logActivity(
  user_id: string,
  user_name: string,
  activity_type: ActivityType,
  church_id: string,
  details?: string
) {
  try {
    const { error } = await supabaseAdmin.from('activity_logs').insert([{
      user_id,
      user_name,
      activity_type,
      church_id,
      details,
      created_at: new Date().toISOString()
    }]);

    if (error) {
      console.error('[Logger] Failed to log activity:', error.message);
      // 만약 테이블이 없다면 여기서 에러가 날 수 있음
    }
  } catch (err) {
    console.error('[Logger] Critical error:', err);
  }
}

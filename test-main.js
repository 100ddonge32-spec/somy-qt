const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { error } = await s.from('church_settings').upsert({
        church_id: 'somy-main',
        church_name: '소미 플랫폼',
        app_subtitle: '교회의 디지털 전환을 돕습니다 (메인 플랫폼)',
        church_logo_url: '/somy.png',
        plan: 'premium',
        community_visible: true,
        sermon_summary: '소미 플랫폼에 오신 것을 환영합니다! \n원하시는 교회의 전용 주소로 접속해주세요 (예: /예수인교회)',
        pastor_column_title: '✨ 환영합니다',
        pastor_column_content: '여기는 플랫폼 메인입니다. 뒷주소에 교회 이름을 적어 전용 화면으로 이동하세요.'
    }, { onConflict: 'church_id' });
    if (error) console.error(error);
    else console.log("Seeded somy-main");
}
run();

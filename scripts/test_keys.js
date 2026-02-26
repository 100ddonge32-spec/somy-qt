const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testAuth() {
    console.log('Testing Anonymous Auth with URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    try {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) {
            console.error('❌ Auth Failed:', error.message);
        } else {
            console.log('✅ Auth Success! User ID:', data.user.id);
        }
    } catch (e) {
        console.error('❌ Exception during Auth:', e.message);
    }
}

testAuth();

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testKeys() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('Testing with V2 keys...');
  console.log('URL:', url);
  console.log('ANON:', anonKey);
  console.log('SERVICE:', serviceKey);

  const supabase = createClient(url, serviceKey);
  const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });

  if (error) {
    console.error('FAILED:', error.message);
  } else {
    console.log('SUCCESS! Count:', data);
  }
}

testKeys();

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

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkGallery() {
  const { data, count, error } = await supabase
    .from('gallery_posts')
    .select('*', { count: 'exact' });

  if (error) {
    console.error('Error fetching gallery posts:', error);
    return;
  }

  console.log('Total gallery posts:', count);
  if (data && data.length > 0) {
    const dates = data.map(p => new Date(p.created_at).getTime());
    console.log('Oldest post:', new Date(Math.min(...dates)).toISOString());
    console.log('Newest post:', new Date(Math.max(...dates)).toISOString());
    
    // Check church_id distribution
    const churchIds = data.reduce((acc, post) => {
      acc[post.church_id] = (acc[post.church_id] || 0) + 1;
      return acc;
    }, {});
    console.log('Posts per church_id:', churchIds);
  } else {
    console.log('No posts found in gallery_posts table.');
  }
}

checkGallery();


const { createClient } = require('@supabase/supabase-js');
try {
    createClient(undefined, undefined);
    console.log("Success");
} catch(e) {
    console.error(e.message);
}

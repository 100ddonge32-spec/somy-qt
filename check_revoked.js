const https = require('https');

const URL = 'https://lfjrfyylsxhvwosdpujv.supabase.co/rest/v1/profiles?select=id&limit=1';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdWJhc2VzZSIsInJlZiI6ImxmanJmeXlsc3hodndvc2RwdWp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNjA3NDUsImV4cCI6MjA4NTgzNjc0NX0.CodaJlrJ2loQTzQZE24IHs7H-DpF1Zu_PMSiRL3cRPw';

function testKey(name, key) {
    console.log(`\n--- Testing ${name} ---`);
    const options = {
        headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`
        }
    };

    https.get(URL, options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            console.log(`Status: ${res.statusCode} ${res.statusMessage}`);
            console.log(`Response: ${data}`);
            if (res.statusCode === 401 || res.statusCode === 403) {
                console.log('Result: Invalid or Revoked Token');
            } else if (res.statusCode === 200) {
                console.log('Result: SUCCESS');
            }
        });
    }).on('error', (err) => {
        console.error('Error:', err.message);
    });
}

testKey('Anon Key', ANON_KEY);
// We don't have the full Service Key in text for this specific test yet, but the user provided it earlier.
// Wait, the user provided it in Step Id: 4525
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdWJhc2VzZSIsInJlZiI6ImxmanJmeXlsc3hodndvc2RwdWp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDI2MDc0NSwiZXhwIjoyMDg1ODM2NzQ1fQ.LAAS6aJenIKYBShIGZsWVKhXNOMKwkuXvpf2NLCGZAI';
testKey('Service Key', SERVICE_KEY);

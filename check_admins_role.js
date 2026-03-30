const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, v] = line.split('=');
  if (k && v) env[k.trim()] = v.trim();
});

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ROLE_KEY = env.NEXT_PUBLIC_SUPABASE_ROLE_KEY;

fetch(`${SUPABASE_URL}/rest/v1/profiles?select=*`, {
  headers: {
    'apikey': SUPABASE_ROLE_KEY,
    'Authorization': `Bearer ${SUPABASE_ROLE_KEY}`
  }
}).then(r => r.json()).then(data => console.log(JSON.stringify(data, null, 2))).catch(console.error);

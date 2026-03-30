const fs = require('fs');
const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, v] = line.split('=');
  if (k && v) env[k.trim()] = v.trim();
});

fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
  headers: { 'apikey': env.NEXT_PUBLIC_SUPABASE_ANON_KEY }
}).then(r => r.json()).then(data => {
  console.log(JSON.stringify(data.definitions.profiles.properties, null, 2));
}).catch(console.error);

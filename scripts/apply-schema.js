const fs = require('fs');
const { Client } = require('pg');

const client = new Client({
  host: 'aws-1-sa-east-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.txswessunrkuvsexxjuu',
  password: 'Deus2026!@#$',
  ssl: { rejectUnauthorized: false },
});

(async () => {
  await client.connect();

  await client.query(`
    drop type if exists public.tx_status cascade;
    drop type if exists public.shift_status cascade;
    drop type if exists public.payment_method cascade;
    drop type if exists public.app_role cascade;
  `);

  const sql = fs.readFileSync('supabase/schema.sql', 'utf8');
  await client.query(sql);

  console.log('SCHEMA_APPLIED_OK');
  await client.end();
})().catch(async (e) => {
  console.error('SCHEMA_APPLY_ERROR');
  console.error(e.message);
  try { await client.end(); } catch {}
  process.exit(1);
});

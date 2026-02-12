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
    alter table public.profiles add column if not exists cpf text;
    alter table public.profiles add column if not exists address text;
    alter table public.profiles add column if not exists phone text;
    alter table public.profiles add column if not exists avatar_url text;
  `);

  console.log('BLOCK7_PROFILE_FIELDS_OK');
  await client.end();
})().catch(async (e) => {
  console.error('BLOCK7_PROFILE_FIELDS_ERROR');
  console.error(e.message);
  try { await client.end(); } catch {}
  process.exit(1);
});

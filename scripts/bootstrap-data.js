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
    insert into public.profiles (user_id, full_name, role, active)
    values ('2ef79d77-291d-4498-a579-cf1f2cd34775','Leal Admin','admin',true)
    on conflict (user_id) do update
    set full_name=excluded.full_name, role=excluded.role, active=true;

    insert into public.profiles (user_id, full_name, role, active)
    values ('728c419c-5322-4db8-9908-5abefa48f23b','Operador Guichê 01','operator',true)
    on conflict (user_id) do update
    set full_name=excluded.full_name, role=excluded.role, active=true;

    insert into public.booths (id, code, name, location, active)
    values ('11111111-1111-4111-8111-111111111111','G01','Guichê 01','Rodoviária Central',true)
    on conflict (id) do update
    set code=excluded.code, name=excluded.name, location=excluded.location, active=true;

    insert into public.operator_booths (operator_id, booth_id, active)
    values ('728c419c-5322-4db8-9908-5abefa48f23b','11111111-1111-4111-8111-111111111111',true)
    on conflict (operator_id, booth_id) do update
    set active=true;

    insert into public.companies (id, name, commission_percent, active)
    values ('22222222-2222-4222-8222-222222222222','Empresa Exemplo',6.000,true)
    on conflict (id) do update
    set name=excluded.name, commission_percent=excluded.commission_percent, active=true;
  `);

  const p = await client.query('select user_id, full_name, role from public.profiles order by role desc, full_name asc');
  const b = await client.query('select id, code, name from public.booths');
  const c = await client.query('select id, name, commission_percent from public.companies');

  console.log('BOOTSTRAP_OK');
  console.log(JSON.stringify({ profiles: p.rows, booths: b.rows, companies: c.rows }, null, 2));

  await client.end();
})().catch(async (e) => {
  console.error('BOOTSTRAP_ERROR');
  console.error(e.message);
  try { await client.end(); } catch {}
  process.exit(1);
});

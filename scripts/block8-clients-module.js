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
    create table if not exists public.clients (
      id uuid primary key default gen_random_uuid(),
      name text not null,
      document text,
      phone text,
      email text,
      address text,
      notes text,
      active boolean not null default true,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create index if not exists clients_name_idx on public.clients(name);

    alter table public.clients enable row level security;

    do $$
    begin
      if not exists (select 1 from pg_policies where schemaname='public' and tablename='clients' and policyname='clients_read_authenticated') then
        create policy clients_read_authenticated on public.clients
        for select using (auth.uid() is not null);
      end if;

      if not exists (select 1 from pg_policies where schemaname='public' and tablename='clients' and policyname='clients_admin_write') then
        create policy clients_admin_write on public.clients
        for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
      end if;
    end $$;
  `);

  console.log('BLOCK8_CLIENTS_MODULE_OK');
  await client.end();
})().catch(async (e) => {
  console.error('BLOCK8_CLIENTS_MODULE_ERROR');
  console.error(e.message);
  try { await client.end(); } catch {}
  process.exit(1);
});

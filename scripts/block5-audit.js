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
    create table if not exists public.audit_logs (
      id uuid primary key default gen_random_uuid(),
      created_by uuid not null references public.profiles(user_id),
      action text not null,
      entity text,
      entity_id text,
      details jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    );

    alter table public.audit_logs enable row level security;

    drop policy if exists audit_self_or_admin_select on public.audit_logs;
    create policy audit_self_or_admin_select on public.audit_logs
      for select using (created_by = auth.uid() or public.is_admin(auth.uid()));

    drop policy if exists audit_insert_authenticated on public.audit_logs;
    create policy audit_insert_authenticated on public.audit_logs
      for insert with check (created_by = auth.uid());
  `);

  console.log('BLOCK5_AUDIT_DB_OK');
  await client.end();
})().catch(async (e) => {
  console.error('BLOCK5_AUDIT_DB_ERROR');
  console.error(e.message);
  try { await client.end(); } catch {}
  process.exit(1);
});

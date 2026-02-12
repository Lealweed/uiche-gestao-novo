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
    create table if not exists public.time_punches (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references public.profiles(user_id),
      booth_id uuid references public.booths(id),
      shift_id uuid references public.shifts(id),
      punch_type text not null check (punch_type in ('entrada','saida','pausa_inicio','pausa_fim')),
      note text,
      punched_at timestamptz not null default now()
    );

    alter table public.time_punches enable row level security;

    drop policy if exists time_punch_self_or_admin_select on public.time_punches;
    create policy time_punch_self_or_admin_select on public.time_punches
      for select using (user_id = auth.uid() or public.is_admin(auth.uid()));

    drop policy if exists time_punch_self_insert on public.time_punches;
    create policy time_punch_self_insert on public.time_punches
      for insert with check (user_id = auth.uid());
  `);

  console.log('BLOCK6_TIME_PUNCH_OK');
  await client.end();
})().catch(async (e) => {
  console.error('BLOCK6_TIME_PUNCH_ERROR');
  console.error(e.message);
  try { await client.end(); } catch {}
  process.exit(1);
});

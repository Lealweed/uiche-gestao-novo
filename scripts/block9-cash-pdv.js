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
    create table if not exists public.cash_movements (
      id uuid primary key default gen_random_uuid(),
      shift_id uuid not null references public.shifts(id) on delete cascade,
      booth_id uuid not null references public.booths(id),
      user_id uuid not null references public.profiles(user_id),
      movement_type text not null check (movement_type in ('suprimento','sangria','ajuste')),
      amount numeric(12,2) not null check (amount > 0),
      note text,
      created_at timestamptz not null default now()
    );

    create index if not exists cash_movements_shift_idx on public.cash_movements(shift_id);
    create index if not exists cash_movements_booth_idx on public.cash_movements(booth_id);
    create index if not exists cash_movements_user_idx on public.cash_movements(user_id);

    alter table public.cash_movements enable row level security;

    do $$
    begin
      if not exists (select 1 from pg_policies where schemaname='public' and tablename='cash_movements' and policyname='cash_movements_self_or_admin_select') then
        create policy cash_movements_self_or_admin_select on public.cash_movements
        for select using (user_id = auth.uid() or public.is_admin(auth.uid()));
      end if;

      if not exists (select 1 from pg_policies where schemaname='public' and tablename='cash_movements' and policyname='cash_movements_self_insert') then
        create policy cash_movements_self_insert on public.cash_movements
        for insert with check (
          user_id = auth.uid()
          and exists (
            select 1 from public.shifts s
            where s.id = cash_movements.shift_id
              and s.operator_id = auth.uid()
              and s.status = 'open'
          )
        );
      end if;

      if not exists (select 1 from pg_policies where schemaname='public' and tablename='cash_movements' and policyname='cash_movements_admin_update') then
        create policy cash_movements_admin_update on public.cash_movements
        for update using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
      end if;
    end $$;
  `);

  console.log('BLOCK9_CASH_PDV_OK');
  await client.end();
})().catch(async (e) => {
  console.error('BLOCK9_CASH_PDV_ERROR');
  console.error(e.message);
  try { await client.end(); } catch {}
  process.exit(1);
});

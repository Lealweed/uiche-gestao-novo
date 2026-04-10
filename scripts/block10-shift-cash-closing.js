const { createDbClient } = require('./db-client');

const client = createDbClient();

(async () => {
  await client.connect();

  await client.query(`
    create table if not exists public.shift_cash_closings (
      id uuid primary key default gen_random_uuid(),
      shift_id uuid not null unique references public.shifts(id) on delete cascade,
      booth_id uuid not null references public.booths(id),
      user_id uuid not null references public.profiles(user_id),
      expected_cash numeric(12,2) not null,
      declared_cash numeric(12,2) not null,
      difference numeric(12,2) not null,
      note text,
      created_at timestamptz not null default now()
    );

    create index if not exists shift_cash_closings_shift_idx on public.shift_cash_closings(shift_id);
    create index if not exists shift_cash_closings_booth_idx on public.shift_cash_closings(booth_id);
    create index if not exists shift_cash_closings_user_idx on public.shift_cash_closings(user_id);

    alter table public.shift_cash_closings enable row level security;

    do $$
    begin
      if not exists (select 1 from pg_policies where schemaname='public' and tablename='shift_cash_closings' and policyname='shift_cash_closings_self_or_admin_select') then
        create policy shift_cash_closings_self_or_admin_select on public.shift_cash_closings
        for select using (user_id = auth.uid() or public.is_admin(auth.uid()));
      end if;

      if not exists (select 1 from pg_policies where schemaname='public' and tablename='shift_cash_closings' and policyname='shift_cash_closings_self_insert') then
        create policy shift_cash_closings_self_insert on public.shift_cash_closings
        for insert with check (
          user_id = auth.uid()
          and exists (
            select 1 from public.shifts s
            where s.id = shift_cash_closings.shift_id
              and s.operator_id = auth.uid()
          )
        );
      end if;

      if not exists (select 1 from pg_policies where schemaname='public' and tablename='shift_cash_closings' and policyname='shift_cash_closings_admin_update') then
        create policy shift_cash_closings_admin_update on public.shift_cash_closings
        for update using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
      end if;
    end $$;
  `);

  console.log('BLOCK10_SHIFT_CASH_CLOSING_OK');
  await client.end();
})().catch(async (e) => {
  console.error('BLOCK10_SHIFT_CASH_CLOSING_ERROR');
  console.error(e.message);
  try { await client.end(); } catch {}
  process.exit(1);
});

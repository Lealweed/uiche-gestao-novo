-- Align app RBAC with database RLS so `tenant_admin` can act as admin
-- and `financeiro` can read dashboard/finance data coming from the booths.

create or replace function public.is_admin(check_user_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = check_user_id
      and p.role in ('admin', 'tenant_admin')
      and p.active = true
  );
$$;

create or replace function public.can_read_admin_data(uid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = uid
      and p.role in ('admin', 'tenant_admin', 'financeiro')
      and p.active = true
  );
$$;

create or replace function public.current_profile_role()
returns public.app_role
language sql
stable
as $$
  select coalesce(
    (
      select p.role::public.app_role
      from public.profiles p
      where p.user_id = auth.uid()
      limit 1
    ),
    'operator'::public.app_role
  );
$$;

grant execute on function public.is_admin(uuid) to authenticated;
grant execute on function public.can_read_admin_data(uuid) to authenticated;

drop policy if exists profiles_self_or_admin_select on public.profiles;
create policy profiles_self_or_admin_select on public.profiles
for select using (user_id = auth.uid() or public.can_read_admin_data(auth.uid()));

drop policy if exists operator_booths_self_or_admin_select on public.operator_booths;
create policy operator_booths_self_or_admin_select on public.operator_booths
for select using (operator_id = auth.uid() or public.can_read_admin_data(auth.uid()));

drop policy if exists shifts_self_or_admin_select on public.shifts;
create policy shifts_self_or_admin_select on public.shifts
for select using (operator_id = auth.uid() or public.can_read_admin_data(auth.uid()));

drop policy if exists tx_self_or_admin_select on public.transactions;
create policy tx_self_or_admin_select on public.transactions
for select using (operator_id = auth.uid() or public.can_read_admin_data(auth.uid()));

drop policy if exists receipts_self_or_admin_select on public.transaction_receipts;
create policy receipts_self_or_admin_select on public.transaction_receipts
for select using (
  public.can_read_admin_data(auth.uid())
  or exists (
    select 1 from public.transactions t
    where t.id = transaction_id and t.operator_id = auth.uid()
  )
);

drop policy if exists adj_self_or_admin_select on public.adjustment_requests;
create policy adj_self_or_admin_select on public.adjustment_requests
for select using (
  requested_by = auth.uid() or public.can_read_admin_data(auth.uid())
);

drop policy if exists audit_self_or_admin_select on public.audit_logs;
create policy audit_self_or_admin_select on public.audit_logs
for select using (created_by = auth.uid() or public.can_read_admin_data(auth.uid()));

drop policy if exists time_punch_self_or_admin_select on public.time_punches;
create policy time_punch_self_or_admin_select on public.time_punches
for select using (user_id = auth.uid() or public.can_read_admin_data(auth.uid()));

drop policy if exists cash_movements_self_or_admin_select on public.cash_movements;
create policy cash_movements_self_or_admin_select on public.cash_movements
for select using (user_id = auth.uid() or public.can_read_admin_data(auth.uid()));

drop policy if exists shift_cash_closings_self_or_admin_select on public.shift_cash_closings;
create policy shift_cash_closings_self_or_admin_select on public.shift_cash_closings
for select using (user_id = auth.uid() or public.can_read_admin_data(auth.uid()));
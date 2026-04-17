-- CEIA resumo: compatibilidade de revisao administrativa e reabertura segura

create index if not exists daily_cash_closings_status_date_idx
  on public.daily_cash_closings(status, date desc);

drop policy if exists daily_cash_closings_self_update on public.daily_cash_closings;
create policy daily_cash_closings_self_update on public.daily_cash_closings
for update
using (
  user_id = auth.uid()
  and status = 'open'
)
with check (
  user_id = auth.uid()
);

drop policy if exists daily_cash_closings_admin_update on public.daily_cash_closings;
create policy daily_cash_closings_admin_update on public.daily_cash_closings
for update
using (public.can_read_admin_data(auth.uid()))
with check (public.can_read_admin_data(auth.uid()));

drop policy if exists daily_cash_closings_admin_delete on public.daily_cash_closings;
create policy daily_cash_closings_admin_delete on public.daily_cash_closings
for delete
using (public.can_read_admin_data(auth.uid()));

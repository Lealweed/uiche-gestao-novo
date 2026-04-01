-- =============================================================
-- FIX: Recreate v_shift_totals sem colunas de IP
-- Roda no SQL Editor do Supabase
-- =============================================================

create or replace view public.v_shift_totals
  with (security_invoker = true)
as
select
  s.id                         as shift_id,
  s.booth_id,
  b.name                       as booth_name,
  s.operator_id,
  p.full_name                  as operator_name,
  s.opened_at,
  s.closed_at,
  s.status,
  count(t.id) filter (where t.status = 'posted')                                                                     as tx_count,
  coalesce(sum(t.amount)            filter (where t.status = 'posted'), 0)::numeric(12,2)                            as gross_amount,
  coalesce(sum(t.commission_amount) filter (where t.status = 'posted'), 0)::numeric(12,2)                            as commission_amount,
  coalesce(sum(t.amount)            filter (where t.status = 'posted' and t.payment_method = 'pix'),    0)::numeric(12,2) as total_pix,
  coalesce(sum(t.amount)            filter (where t.status = 'posted' and t.payment_method = 'credit'), 0)::numeric(12,2) as total_credit,
  coalesce(sum(t.amount)            filter (where t.status = 'posted' and t.payment_method = 'debit'),  0)::numeric(12,2) as total_debit,
  coalesce(sum(t.amount)            filter (where t.status = 'posted' and t.payment_method = 'cash'),   0)::numeric(12,2) as total_cash,
  count(t.id) filter (where t.status = 'posted' and t.payment_method in ('credit','debit'))                          as card_tx_count,
  count(r.id)                                                                                                         as card_receipt_count,
  (count(t.id) filter (where t.status = 'posted' and t.payment_method in ('credit','debit')) - count(r.id))          as missing_card_receipts
from public.shifts s
join  public.booths b  on b.id       = s.booth_id
join  public.profiles p on p.user_id = s.operator_id
left  join public.transactions t        on t.shift_id       = s.id
left  join public.transaction_receipts r on r.transaction_id = t.id
group by s.id, s.booth_id, b.name, s.operator_id, p.full_name, s.opened_at, s.closed_at, s.status;

-- Garante que a role authenticated pode consultar a view
grant select on public.v_shift_totals to authenticated;

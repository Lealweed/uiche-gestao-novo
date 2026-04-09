-- Alinha o status de transacao com a baixa de repasse e preserva os totais no dashboard.

do $$
begin
  if exists (select 1 from pg_type where typname = 'tx_status') then
    begin
      alter type public.tx_status add value if not exists 'settled';
    exception
      when duplicate_object then null;
    end;
  end if;
end $$;

create or replace view public.v_shift_totals as
select
  s.id as shift_id,
  s.booth_id,
  b.name as booth_name,
  s.operator_id,
  p.full_name as operator_name,
  s.opened_at,
  s.closed_at,
  s.status,
  count(t.id) filter (where t.status <> 'voided') as tx_count,
  coalesce(sum(t.amount) filter (where t.status <> 'voided'), 0)::numeric(12,2) as gross_amount,
  coalesce(sum(t.commission_amount) filter (where t.status <> 'voided'), 0)::numeric(12,2) as commission_amount,
  coalesce(sum(t.amount) filter (where t.status <> 'voided' and t.payment_method = 'pix'), 0)::numeric(12,2) as total_pix,
  coalesce(sum(t.amount) filter (where t.status <> 'voided' and t.payment_method = 'credit'), 0)::numeric(12,2) as total_credit,
  coalesce(sum(t.amount) filter (where t.status <> 'voided' and t.payment_method = 'debit'), 0)::numeric(12,2) as total_debit,
  coalesce(sum(t.amount) filter (where t.status <> 'voided' and t.payment_method = 'cash'), 0)::numeric(12,2) as total_cash,
  count(t.id) filter (where t.status <> 'voided' and t.payment_method in ('credit', 'debit')) as card_tx_count,
  count(r.id) as card_receipt_count,
  (count(t.id) filter (where t.status <> 'voided' and t.payment_method in ('credit', 'debit')) - count(r.id)) as missing_card_receipts
from public.shifts s
join public.booths b on b.id = s.booth_id
join public.profiles p on p.user_id = s.operator_id
left join public.transactions t on t.shift_id = s.id
left join public.transaction_receipts r on r.transaction_id = t.id
group by s.id, b.name, p.full_name;

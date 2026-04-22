-- Central Viagens P0 - fechamento por resumo com abatimentos explicitos

alter table public.daily_cash_closings
  add column if not exists costs_amount numeric(12,2) default 0;

alter table public.daily_cash_closings
  add column if not exists sangria_amount numeric(12,2) default 0;

update public.daily_cash_closings
  set costs_amount = 0
  where costs_amount is null;

update public.daily_cash_closings
  set sangria_amount = 0
  where sangria_amount is null;

alter table public.daily_cash_closings
  alter column costs_amount type numeric(12,2) using coalesce(costs_amount, 0)::numeric(12,2),
  alter column costs_amount set default 0,
  alter column costs_amount set not null,
  alter column sangria_amount type numeric(12,2) using coalesce(sangria_amount, 0)::numeric(12,2),
  alter column sangria_amount set default 0,
  alter column sangria_amount set not null;

drop view if exists public.v_admin_cash_audit;
drop view if exists public.vw_ceia_closing_report;

create or replace view public.vw_ceia_closing_report as
select
  d.id,
  d.office_id,
  d.user_id,
  d.date,
  d.company,
  d.total_sold,
  d.amount_pix,
  d.amount_card,
  d.amount_cash,
  d.ceia_base,
  d.ceia_pix,
  d.ceia_debito,
  d.ceia_credito,
  d.ceia_link_estadual,
  d.ceia_link_interestadual,
  d.ceia_dinheiro,
  d.ceia_total_lancado,
  d.ceia_faltante,
  d.qtd_taxa_estadual,
  d.qtd_taxa_interestadual,
  d.link_pagamento,
  d.costs_amount,
  d.sangria_amount,
  (
    coalesce(d.costs_amount, 0)
    + coalesce(d.sangria_amount, 0)
  )::numeric(12,2) as total_abatimentos,
  (
    coalesce(d.ceia_total_lancado, 0)
    - coalesce(d.costs_amount, 0)
    - coalesce(d.sangria_amount, 0)
  )::numeric(12,2) as resultado_liquido,
  d.cash_net,
  d.status,
  d.notes,
  d.created_at,
  p.full_name as operator_name,
  b.name as booth_name,
  b.code as booth_code
from public.daily_cash_closings d
left join public.profiles p on p.user_id = d.user_id
left join public.booths b on b.id = d.office_id;

create or replace view public.v_admin_cash_audit as
select
  d.id,
  d.office_id,
  d.user_id,
  d.date,
  d.company,
  d.total_sold as total_vendido_externo,
  d.total_sold,
  d.ceia_base as total_informado,
  d.ceia_base as total_cea,
  (
    coalesce(d.ceia_pix, 0)
    + coalesce(d.ceia_debito, 0)
    + coalesce(d.ceia_credito, 0)
    + coalesce(d.ceia_dinheiro, 0)
    + coalesce(d.link_pagamento, 0)
  )::numeric(12,2) as total_lancado_sem_taxas,
  d.ceia_link_estadual as taxa_estadual,
  d.ceia_link_interestadual as taxa_interestadual,
  (
    coalesce(d.ceia_link_estadual, 0)
    + coalesce(d.ceia_link_interestadual, 0)
  )::numeric(12,2) as total_taxas,
  (
    coalesce(d.ceia_pix, 0)
    + coalesce(d.ceia_debito, 0)
    + coalesce(d.ceia_credito, 0)
    + coalesce(d.ceia_dinheiro, 0)
    + coalesce(d.link_pagamento, 0)
    + coalesce(d.ceia_link_estadual, 0)
    + coalesce(d.ceia_link_interestadual, 0)
  )::numeric(12,2) as total_geral_lancado,
  d.amount_pix,
  d.amount_card,
  d.amount_cash,
  d.ceia_amount,
  d.ceia_base,
  d.ceia_pix,
  d.ceia_debito,
  d.ceia_credito,
  d.ceia_link_estadual,
  d.ceia_link_interestadual,
  d.ceia_dinheiro,
  d.ceia_total_lancado,
  d.ceia_total_lancado as total_lancado,
  d.ceia_faltante,
  d.ceia_faltante as diferenca,
  d.ceia_faltante as diferenca_cea,
  d.qtd_taxa_estadual,
  d.qtd_taxa_interestadual,
  d.link_pagamento,
  d.costs_amount,
  d.sangria_amount,
  (
    coalesce(d.costs_amount, 0)
    + coalesce(d.sangria_amount, 0)
  )::numeric(12,2) as total_abatimentos,
  (
    coalesce(d.ceia_total_lancado, 0)
    - coalesce(d.costs_amount, 0)
    - coalesce(d.sangria_amount, 0)
  )::numeric(12,2) as resultado_liquido,
  d.cash_net,
  d.status,
  case
    when abs(coalesce(d.ceia_faltante, 0)) < 0.01 then 'CONFERIDO'
    when coalesce(d.ceia_faltante, 0) > 0 then 'FALTANDO'
    else 'EXCEDIDO'
  end as status_conferencia,
  d.notes,
  d.created_at,
  p.full_name as operator_name,
  b.name as booth_name,
  b.code as booth_code
from public.daily_cash_closings d
left join public.profiles p on p.user_id = d.user_id
left join public.booths b on b.id = d.office_id;

grant select on public.vw_ceia_closing_report to authenticated;
grant select on public.v_admin_cash_audit to authenticated;
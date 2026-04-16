-- Conferência CEIA por abatimento em tempo real no fechamento diário

alter table if exists public.daily_cash_closings
  add column if not exists ceia_base numeric(12,2) not null default 0 check (ceia_base >= 0),
  add column if not exists ceia_pix numeric(12,2) not null default 0 check (ceia_pix >= 0),
  add column if not exists ceia_debito numeric(12,2) not null default 0 check (ceia_debito >= 0),
  add column if not exists ceia_credito numeric(12,2) not null default 0 check (ceia_credito >= 0),
  add column if not exists ceia_link_estadual numeric(12,2) not null default 0 check (ceia_link_estadual >= 0),
  add column if not exists ceia_link_interestadual numeric(12,2) not null default 0 check (ceia_link_interestadual >= 0),
  add column if not exists ceia_dinheiro numeric(12,2) not null default 0 check (ceia_dinheiro >= 0),
  add column if not exists ceia_total_lancado numeric(12,2) not null default 0 check (ceia_total_lancado >= 0),
  add column if not exists ceia_faltante numeric(12,2) not null default 0;

update public.daily_cash_closings
set
  ceia_base = case when coalesce(ceia_base, 0) = 0 then coalesce(ceia_amount, 0) else ceia_base end,
  ceia_dinheiro = case when coalesce(ceia_dinheiro, 0) = 0 then coalesce(ceia_amount, 0) else ceia_dinheiro end;

update public.daily_cash_closings
set
  ceia_total_lancado = round((
    coalesce(ceia_pix, 0) +
    coalesce(ceia_debito, 0) +
    coalesce(ceia_credito, 0) +
    coalesce(ceia_link_estadual, 0) +
    coalesce(ceia_link_interestadual, 0) +
    coalesce(ceia_dinheiro, 0)
  )::numeric, 2),
  ceia_faltante = round((
    coalesce(ceia_base, 0) - (
      coalesce(ceia_pix, 0) +
      coalesce(ceia_debito, 0) +
      coalesce(ceia_credito, 0) +
      coalesce(ceia_link_estadual, 0) +
      coalesce(ceia_link_interestadual, 0) +
      coalesce(ceia_dinheiro, 0)
    )
  )::numeric, 2);

-- =============================================================
-- Adiciona colunas de Taxa de Embarque na tabela transactions
-- Roda no SQL Editor do Supabase
-- =============================================================

alter table public.transactions
  add column if not exists boarding_tax_state   numeric(12,2) not null default 0,
  add column if not exists boarding_tax_federal  numeric(12,2) not null default 0;

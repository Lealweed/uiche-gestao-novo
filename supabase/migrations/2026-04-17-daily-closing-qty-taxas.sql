-- Migration: Adiciona colunas de quantidade de taxas ao daily_cash_closings
-- Idempotente: usa IF NOT EXISTS

ALTER TABLE public.daily_cash_closings
  ADD COLUMN IF NOT EXISTS qtd_taxa_estadual integer DEFAULT 0;

ALTER TABLE public.daily_cash_closings
  ADD COLUMN IF NOT EXISTS qtd_taxa_interestadual integer DEFAULT 0;

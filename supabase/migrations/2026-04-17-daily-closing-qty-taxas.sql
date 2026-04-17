-- Migration: Adiciona colunas de quantidade de taxas e link de pagamento
-- Idempotente: usa IF NOT EXISTS

ALTER TABLE public.daily_cash_closings
  ADD COLUMN IF NOT EXISTS qtd_taxa_estadual integer DEFAULT 0;

ALTER TABLE public.daily_cash_closings
  ADD COLUMN IF NOT EXISTS qtd_taxa_interestadual integer DEFAULT 0;

ALTER TABLE public.daily_cash_closings
  ADD COLUMN IF NOT EXISTS link_pagamento numeric DEFAULT 0;

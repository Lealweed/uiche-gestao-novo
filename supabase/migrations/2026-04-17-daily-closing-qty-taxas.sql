-- Migration: Ajusta daily_cash_closings para novo modelo (sem PDV)
-- 1. Adiciona colunas novas (qtd taxas + link pagamento)
-- 2. Remove constraint legada payment_sum_check (não vale mais)
-- 3. Converte cash_net de generated para coluna regular
-- Idempotente: usa IF NOT EXISTS e DO blocks

-- ====================================================================
-- 1. Novas colunas
-- ====================================================================
ALTER TABLE public.daily_cash_closings
  ADD COLUMN IF NOT EXISTS qtd_taxa_estadual integer DEFAULT 0;

ALTER TABLE public.daily_cash_closings
  ADD COLUMN IF NOT EXISTS qtd_taxa_interestadual integer DEFAULT 0;

ALTER TABLE public.daily_cash_closings
  ADD COLUMN IF NOT EXISTS link_pagamento numeric DEFAULT 0;

-- ====================================================================
-- 2. Remover constraint legada (amount_pix + amount_card + amount_cash = total_sold)
--    No novo modelo, total_sold = ceiaBase e os meios não somam mais nesse formato.
-- ====================================================================
ALTER TABLE public.daily_cash_closings
  DROP CONSTRAINT IF EXISTS daily_cash_closings_payment_sum_check;

-- ====================================================================
-- 3. Converter cash_net de GENERATED ALWAYS para coluna regular
--    A fórmula antiga (amount_cash - ceia_amount) não faz sentido no novo modelo.
--    O app agora grava cash_net diretamente.
-- ====================================================================
DO $$
BEGIN
  -- Verifica se cash_net é generated; se for, recria como regular
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'daily_cash_closings'
      AND column_name = 'cash_net'
      AND is_generated = 'ALWAYS'
  ) THEN
    ALTER TABLE public.daily_cash_closings DROP COLUMN cash_net;
    ALTER TABLE public.daily_cash_closings ADD COLUMN cash_net numeric(12,2) NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Migration: CEIA-first hygiene
-- Objetivo: criar view consolidada, indexes de performance e documentar tabelas legadas.
-- NÃO apaga dados legados — apenas marca como deprecated no schema.

-- ====================================================================
-- 1. View consolidada de relatório CEIA
-- ====================================================================
CREATE OR REPLACE VIEW public.vw_ceia_closing_report AS
SELECT
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
  d.cash_net,
  d.status,
  d.notes,
  d.created_at,
  p.full_name AS operator_name,
  b.name     AS booth_name,
  b.code     AS booth_code
FROM public.daily_cash_closings d
LEFT JOIN public.profiles p ON p.user_id = d.user_id
LEFT JOIN public.booths   b ON b.id      = d.office_id;

-- ====================================================================
-- 2. Indexes de performance para consultas frequentes
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_daily_cash_closings_office_date
  ON public.daily_cash_closings (office_id, date);

CREATE INDEX IF NOT EXISTS idx_daily_cash_closings_company
  ON public.daily_cash_closings (company);

CREATE INDEX IF NOT EXISTS idx_daily_cash_closings_user_date
  ON public.daily_cash_closings (user_id, date);

-- ====================================================================
-- 3. RLS: a view herda RLS da tabela base (daily_cash_closings).
--    Garante que operador vê só seus registros e admin vê tudo.
-- ====================================================================

-- Política de leitura para operador (próprios registros)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'daily_cash_closings'
      AND policyname = 'operator_read_own_closings'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY operator_read_own_closings
        ON public.daily_cash_closings
        FOR SELECT
        USING (auth.uid() = user_id)
    $policy$;
  END IF;
END $$;

-- Política de inserção para operador
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'daily_cash_closings'
      AND policyname = 'operator_insert_own_closings'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY operator_insert_own_closings
        ON public.daily_cash_closings
        FOR INSERT
        WITH CHECK (auth.uid() = user_id)
    $policy$;
  END IF;
END $$;

-- Política de update para operador (próprios registros)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'daily_cash_closings'
      AND policyname = 'operator_update_own_closings'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY operator_update_own_closings
        ON public.daily_cash_closings
        FOR UPDATE
        USING (auth.uid() = user_id)
    $policy$;
  END IF;
END $$;

-- Política de leitura para admin (todos os registros)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'daily_cash_closings'
      AND policyname = 'admin_read_all_closings'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY admin_read_all_closings
        ON public.daily_cash_closings
        FOR SELECT
        USING (public.is_admin())
    $policy$;
  END IF;
END $$;

-- ====================================================================
-- 4. Documentação: marcar tabelas/colunas legadas como deprecated
-- ====================================================================
COMMENT ON TABLE public.transactions IS
  '[DEPRECATED] Tabela legada de transacoes por item (Caixa PDV). Mantida para historico. Novas operacoes usam daily_cash_closings com fluxo CEIA-first.';

COMMENT ON COLUMN public.daily_cash_closings.ceia_amount IS
  '[DEPRECATED] Usar ceia_dinheiro. Campo mantido por compatibilidade.';

-- ====================================================================
-- 5. Grant acesso à view
-- ====================================================================
GRANT SELECT ON public.vw_ceia_closing_report TO authenticated;

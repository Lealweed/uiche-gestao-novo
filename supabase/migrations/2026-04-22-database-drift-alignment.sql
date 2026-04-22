-- Alinhamento de drift entre schema base, fluxo CEIA e painel admin

DROP VIEW IF EXISTS public.v_admin_cash_audit;
DROP VIEW IF EXISTS public.vw_ceia_closing_report;

ALTER TABLE public.daily_cash_closings
  ADD COLUMN IF NOT EXISTS qtd_taxa_estadual integer DEFAULT 0;

ALTER TABLE public.daily_cash_closings
  ADD COLUMN IF NOT EXISTS qtd_taxa_interestadual integer DEFAULT 0;

ALTER TABLE public.daily_cash_closings
  ADD COLUMN IF NOT EXISTS link_pagamento numeric(12,2) DEFAULT 0;

UPDATE public.daily_cash_closings
  SET qtd_taxa_estadual = 0
  WHERE qtd_taxa_estadual IS NULL;

UPDATE public.daily_cash_closings
  SET qtd_taxa_interestadual = 0
  WHERE qtd_taxa_interestadual IS NULL;

UPDATE public.daily_cash_closings
  SET link_pagamento = 0
  WHERE link_pagamento IS NULL;

ALTER TABLE public.daily_cash_closings
  ALTER COLUMN qtd_taxa_estadual SET DEFAULT 0,
  ALTER COLUMN qtd_taxa_estadual SET NOT NULL,
  ALTER COLUMN qtd_taxa_interestadual SET DEFAULT 0,
  ALTER COLUMN qtd_taxa_interestadual SET NOT NULL,
  ALTER COLUMN link_pagamento TYPE numeric(12,2) USING COALESCE(link_pagamento, 0)::numeric(12,2),
  ALTER COLUMN link_pagamento SET DEFAULT 0,
  ALTER COLUMN link_pagamento SET NOT NULL;

ALTER TABLE public.daily_cash_closings
  DROP CONSTRAINT IF EXISTS daily_cash_closings_payment_sum_check;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'daily_cash_closings'
      AND column_name = 'cash_net'
      AND is_generated = 'ALWAYS'
  ) THEN
    ALTER TABLE public.daily_cash_closings ALTER COLUMN cash_net DROP EXPRESSION;
  END IF;
END $$;

UPDATE public.daily_cash_closings
  SET cash_net = COALESCE(cash_net, ceia_dinheiro, amount_cash, 0)
  WHERE cash_net IS NULL;

ALTER TABLE public.daily_cash_closings
  ALTER COLUMN cash_net SET DEFAULT 0,
  ALTER COLUMN cash_net SET NOT NULL;

CREATE INDEX IF NOT EXISTS daily_cash_closings_status_date_idx
  ON public.daily_cash_closings(status, date desc);

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
  d.qtd_taxa_estadual,
  d.qtd_taxa_interestadual,
  d.link_pagamento,
  d.cash_net,
  d.status,
  d.notes,
  d.created_at,
  p.full_name AS operator_name,
  b.name AS booth_name,
  b.code AS booth_code
FROM public.daily_cash_closings d
LEFT JOIN public.profiles p ON p.user_id = d.user_id
LEFT JOIN public.booths b ON b.id = d.office_id;

CREATE OR REPLACE VIEW public.v_admin_cash_audit AS
SELECT
  d.id,
  d.office_id,
  d.user_id,
  d.date,
  d.company,
  d.total_sold,
  d.ceia_base AS total_informado,
  d.ceia_base AS total_cea,
  (
    COALESCE(d.ceia_pix, 0)
    + COALESCE(d.ceia_debito, 0)
    + COALESCE(d.ceia_credito, 0)
    + COALESCE(d.ceia_dinheiro, 0)
    + COALESCE(d.link_pagamento, 0)
  )::numeric(12,2) AS total_lancado_sem_taxas,
  d.ceia_link_estadual AS taxa_estadual,
  d.ceia_link_interestadual AS taxa_interestadual,
  (
    COALESCE(d.ceia_link_estadual, 0)
    + COALESCE(d.ceia_link_interestadual, 0)
  )::numeric(12,2) AS total_taxas,
  (
    COALESCE(d.ceia_pix, 0)
    + COALESCE(d.ceia_debito, 0)
    + COALESCE(d.ceia_credito, 0)
    + COALESCE(d.ceia_dinheiro, 0)
    + COALESCE(d.link_pagamento, 0)
    + COALESCE(d.ceia_link_estadual, 0)
    + COALESCE(d.ceia_link_interestadual, 0)
  )::numeric(12,2) AS total_geral_lancado,
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
  d.ceia_total_lancado AS total_lancado,
  d.ceia_faltante,
  d.ceia_faltante AS diferenca,
  d.ceia_faltante AS diferenca_cea,
  d.qtd_taxa_estadual,
  d.qtd_taxa_interestadual,
  d.link_pagamento,
  d.cash_net,
  d.status,
  CASE
    WHEN ABS(COALESCE(d.ceia_faltante, 0)) < 0.01 THEN 'CONFERIDO'
    WHEN COALESCE(d.ceia_faltante, 0) > 0 THEN 'FALTANDO'
    ELSE 'EXCEDIDO'
  END AS status_conferencia,
  d.notes,
  d.created_at,
  p.full_name AS operator_name,
  b.name AS booth_name,
  b.code AS booth_code
FROM public.daily_cash_closings d
LEFT JOIN public.profiles p ON p.user_id = d.user_id
LEFT JOIN public.booths b ON b.id = d.office_id;

GRANT SELECT ON public.vw_ceia_closing_report TO authenticated;
GRANT SELECT ON public.v_admin_cash_audit TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'shift_cash_closings'
      AND policyname = 'shift_cash_closings_self_update'
  ) THEN
    CREATE POLICY shift_cash_closings_self_update
      ON public.shift_cash_closings
      FOR UPDATE
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;
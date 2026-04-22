# Central Viagens — Fechamento Por Resumo (P0)

## Saneamento

### Tabelas ativas no fluxo atual

- `public.daily_cash_closings`: fonte de verdade do fechamento por resumo por guiche, data, empresa e operador.
- `public.shift_cash_closings`: fechamento fisico do caixa do turno.
- `public.shifts`: abertura e encerramento operacional do guiche.
- `public.cash_movements`: suprimentos, sangrias e ajustes operacionais do caixa.
- `public.user_attendance` e `public.time_punches`: ponto do operador.
- `public.operator_messages`: canal operador/admin.
- `public.audit_logs`: rastreabilidade.
- `public.booths`, `public.operator_booths`, `public.profiles`, `public.companies`: cadastro base do fluxo.
- `public.boarding_taxes`: apoio administrativo para taxas.

### Tabelas legadas ou secundarias

- `public.transactions`: legado do PDV por passagem unitaria. Ainda aparece em relatorios e alguns agregados administrativos.
- `public.transaction_receipts`: legado associado ao fluxo unitario.
- `public.adjustment_requests`: legado de ajuste sobre transacao unitaria.
- `public.transaction_categories` e `public.transaction_subcategories`: legado do PDV unitario.

### Fonte de verdade do fechamento

- Fonte unica do fechamento comercial: `public.daily_cash_closings`.
- Chave funcional: `office_id + user_id + date + company`.
- Campos principais do resumo:
  - `total_sold` / `ceia_base`: total vendido no sistema externo
  - `ceia_pix`, `ceia_debito`, `ceia_credito`, `ceia_dinheiro`, `link_pagamento`: meios lancados
  - `ceia_link_estadual`, `ceia_link_interestadual`: taxas separadas
  - `costs_amount`, `sangria_amount`: abatimentos do fechamento
  - `ceia_total_lancado`: total lancado do resumo
  - `ceia_faltante`: diferenca entre externo e lancado
- `shift_cash_closings` continua sendo fonte do fechamento fisico da gaveta, nao do fechamento comercial.
- `cash_movements` continua operacional e historico; nao substitui o resumo comercial.

### Diretriz P0

- Nao apagar tabelas legadas nesta etapa.
- Novas telas devem ler `daily_cash_closings` como dominio principal.
- Tudo que for dashboard, relatorio diario e historico operacional deve derivar do resumo por guiche.
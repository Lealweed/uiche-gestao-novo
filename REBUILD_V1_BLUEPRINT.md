# Central Viagens — Rebuild Total (V1)

## Objetivo
Reconstruir o sistema do zero com **mesmas funções de negócio**, nova base visual premium e arquitetura estável.

---

## Princípios (não negociáveis)
1. Uma única linha de produto (sem v2/v3/legado misturado).
2. Banco com contrato explícito (schema versionado por migration).
3. Fluxos críticos primeiro (Operador núcleo).
4. Deploy só com smoke test obrigatório.
5. PT-BR limpo e consistente.

---

## Escopo V1 (funções mantidas)

### Operador (núcleo)
- Login e validação de perfil ativo.
- Abertura de turno.
- Lançamento de venda.
- Upload de comprovante (cartão).
- Caixa PDV (suprimento/sangria/ajuste).
- Ponto (entrada/pausa/saída).
- Encerramento de turno com fechamento de caixa.
- Solicitação de ajuste.

### Admin (núcleo)
- Dashboard operacional/financeiro.
- Cadastros: Operadores, Guichês, Empresas, Categorias/Subcategorias.
- Gestão de vínculos operador↔guichê.
- Conferência de caixa e fechamento.
- Aprovar/rejeitar ajustes.
- Relatórios essenciais (dia/período).

---

## Ordem de execução (blocos)

### Bloco 1 — Fundação técnica
- Novo design system (tokens, tipografia, spacing, cards, tabelas).
- Casca de app (layout, menu, auth guard).
- Infra de estado de tela (loading/error/empty/success).

### Bloco 2 — Operador V1 (produção)
- Fluxo completo do operador do início ao fim.
- Upload de comprovante com feedback forte.
- Modal de fechamento (sem prompt).

### Bloco 3 — Admin V1 (produção)
- Dashboard com KPIs essenciais.
- Cadastros principais + vínculos.
- Ajustes e conferência financeira.

### Bloco 4 — Relatórios + polimento
- Relatórios por período/operador/guichê/categoria.
- Exportações CSV.
- Revisão visual premium final.

---

## Modelo de dados (base V1)
Tabelas obrigatórias:
- profiles
- booths
- operator_booths
- companies
- transaction_categories
- transaction_subcategories
- shifts
- transactions
- transaction_receipts
- time_punches
- cash_movements
- shift_cash_closings
- adjustment_requests
- audit_logs

Views/RPC obrigatórios:
- v_shift_totals
- open_shift(...)
- close_shift(...)

---

## Critérios de aceite por bloco
- `npm run build` obrigatório.
- Sem texto corrompido/encoding quebrado.
- Smoke test do bloco aprovado.
- Commit com escopo claro.

---

## Smoke test mínimo (release)
1. Admin login e dashboard carregando.
2. Operador abre turno.
3. Operador lança venda (PIX e cartão).
4. Operador anexa comprovante.
5. Operador registra caixa.
6. Operador encerra turno com fechamento.
7. Admin visualiza/valida fechamento.
8. Admin aprova/rejeita ajuste.

---

## Status
- Fase atual: **Início do Rebuild**
- Próxima ação: **Bloco 1 (Fundação técnica)**

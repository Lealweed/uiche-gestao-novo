# SAAS F1→F4 — Execução Consolidada

## F1 Core SaaS (multi-tenant + RBAC)
- Migration criada: `supabase/migrations/2026-03-01-f1-multitenant-rbac.sql`
  - Tabela `tenants`
  - `tenant_id` nas tabelas core
  - Backfill para tenant padrão
  - Índices por tenant
  - Funções `current_tenant_id`, `has_role`, `is_tenant_admin`, `is_financeiro`
  - Papéis SaaS: `tenant_admin`, `operator`, `financeiro` (compat com `admin` legado)
- Guards atualizados no `/rebuild` para aceitar RBAC SaaS.

## F2 Operação
- Fluxo de turno/lançamento/comprovante/caixa permanece no `app/rebuild/operator/page.tsx`.
- Mantida robustez contra tabela ausente com mensagens amigáveis e fallback (já existente no rebuild).

## F3 Admin/Financeiro
- Financeiro atual exposto como seção interna em `/rebuild/admin#financeiro`.
  - Dashboard executivo financeiro
  - Conciliação de caixa
  - Ajustes/conciliação (aprovar/rejeitar em `adjustment_requests`)
- Shell atualizada para navegação financeira: `components/rebuild/shell/rebuild-shell.tsx`.
- Observação: `src/app/gerencia` permanece como módulo legado/inativo, fora do build principal atual.

## F4 Relatórios + Go-live
- Relatórios admin com filtros por período (início/fim), agrupamentos existentes e export CSV.
- Checklist de go-live: `QUALITY_GATE.md` + checklist abaixo.

## Checklist de Aceite (Go-live)
- [ ] `npm run build` OK
- [ ] Login tenant_admin funcionando
- [ ] Login operator funcionando
- [ ] Login financeiro funcionando
- [ ] Abertura/fechamento de turno OK
- [ ] Lançamento + comprovante cartão OK
- [ ] Caixa PDV (suprimento/sangria/ajuste) OK
- [ ] Relatórios por período + CSV OK
- [ ] Financeiro (conciliação + ajustes) OK
- [ ] Mensagens PT-BR sem erro técnico para usuário final

## Riscos residuais
1. Políticas RLS por tenant podem conflitar com policies legadas dependendo da ordem de execução no banco.
2. Ambientes sem tabela `adjustment_requests` terão módulo financeiro em modo vazio até migração aplicada.
3. Deploy depende de credenciais/integração do provedor (Vercel/Supabase) no host atual.

# QUALITY GATE — Implementação Real (Leal)

Objetivo: garantir que toda feature/correção foi realmente aplicada e validada no sistema.

## Regra principal
Sem passar por este gate, **não publicar como concluído**.

## Gate por bloco (obrigatório)
1. **Código aplicado**
   - Arquivos alterados listados
   - Commit com mensagem clara
2. **Build**
   - `npm run build` obrigatório
3. **Teste funcional mínimo**
   - Validar fluxo principal afetado (ex.: login, menu, CRUD, fechamento)
4. **Evidência**
   - Checklist OK/FAIL
   - Se possível, print/rota validada
5. **Deploy**
   - Publicar e informar URL final
6. **Revalidação pós-deploy**
   - Abrir rota em produção
   - Confirmar que mudança aparece (não cache/versão antiga)

## Checklist padrão (Admin/Operador)
- [ ] Login funciona
- [ ] Menu lateral abre todas as seções
- [ ] Dashboard carrega sem erro fatal
- [ ] CRUD Empresas funciona
- [ ] CRUD Guichês funciona
- [ ] CRUD Categorias/Subcategorias funciona
- [ ] Usuários (active/role) funciona
- [ ] Vínculos operador↔guichê funciona
- [ ] Operador abre turno
- [ ] Operador lança venda
- [ ] Operador anexa comprovante
- [ ] Operador registra caixa
- [ ] Operador encerra turno
- [ ] Relatórios/exportações funcionam

## Skills a usar no gate
- `afrexai-qa-testing-engine` (plano/checklist de QA)
- `qa-testing-bots` (cenários repetitivos)
- `e2e-testing-patterns` (fluxos ponta a ponta)
- `agent-evaluation` (avaliação de qualidade da entrega)
- `arc-security-audit` (auditoria de segurança)
- `supabase-ops` (saúde de schema/RLS)
- `ui-audit` (consistência visual)

## Critério de GO-LIVE
GO-LIVE = todos os itens críticos do checklist em OK + build OK + validação em produção.

# Refatoração Admin + Operador (Supabase schema-safe + visual premium)

## 1) Mapeamento de queries com join relacional (app/admin + app/operator)

### app/admin/page.tsx
- **Status:** já estava em padrão seguro (sem joins relacionais no `select`).
- Hidratação já era feita por mapas (`Map`) locais:
  - `profiles`, `booths`, `companies`, `transaction_categories`, `transaction_subcategories`
  - uso posterior para montar objetos derivados (ex.: `hydratedTxs`, `hydratedLinks`, `hydratedAudit`, etc.).

### app/operator/page.tsx
- **Join frágil encontrado e removido:**
  - Antes: `transactions.select("..., companies(name), transaction_receipts(id)")`
- Esse padrão dependia do schema cache relacional do Supabase (suscetível a erro quando relação/tabela não está no cache).

---

## 2) Substituição por leituras base + hidratação por mapas seguros

### app/operator/page.tsx
- `loadTxs` foi refatorado para:
  1. Buscar base em `transactions` sem join: `id, amount, payment_method, sold_at, ticket_reference, note, company_id`.
  2. Buscar comprovantes em `transaction_receipts` por `transaction_id` (`in`).
  3. Buscar nomes em `companies` por `id` (`in`).
  4. Hidratar com mapas:
     - `company_name`
     - `receipt_count`
- Modelo de `Tx` atualizado para dados hidratados estáveis:
  - remove `companies` e `transaction_receipts`
  - adiciona `company_id`, `company_name`, `receipt_count`

---

## 3) Padronização visual premium

### app/operator/page.tsx
- Mantido layout premium existente (glass cards, cockpit, barras legíveis).
- Ajustes de render para o novo modelo hidratado:
  - listagem mobile e tabela desktop agora exibem `tx.company_name`
  - pendências de comprovante baseadas em `tx.receipt_count`
- Seleção de guichê simplificada para estrutura plana (`booth_name`) para consistência visual e de dados.

---

## 4) Fallback para tabelas/colunas ausentes sem travar dashboard

### app/operator/page.tsx
- Adicionado `isSchemaToleranceError(...)` para tolerar erros de schema em leituras não-críticas.
- Boot inicial com fallback seguro em:
  - `operator_booths`, `companies`, `transaction_categories`, `transaction_subcategories`, `booths`
- `loadPunches` e `loadCashMovements` agora:
  - ignoram erro tolerável de schema (retornando lista vazia)
  - reportam somente erros realmente críticos
- Resultado: dashboard mantém renderização mesmo com ausência de tabelas/colunas auxiliares.

---

## 5) Build

- `npm run build` executado com sucesso.
- Next.js compilou e gerou páginas estáticas sem erro.

---

## Erros corrigidos

1. Dependência de join relacional frágil em `operator` para:
   - `companies(name)`
   - `transaction_receipts(id)`
2. Risco de quebra por schema incompleto em leituras auxiliares do operador (agora com fallback).

## Arquivos alterados

- `app/operator/page.tsx`
- `REFATORACAO_ADMIN_OPERATOR_RESUMO.md`

## Riscos remanescentes

1. `profiles` na carga inicial do operador ainda usa leitura direta de colunas (`role, active`); se houver divergência estrutural extrema nessa tabela, pode impactar roteamento por papel.
2. Escritas (`insert/update/upsert`) continuam dependentes do schema esperado (o que é desejável, mas não “tolerante” por natureza).
3. Há arquivos não rastreados no repositório (pré-existentes) que não fazem parte desta refatoração.

## Próximos passos sugeridos

1. Extrair utilitário comum de tolerância/hidratação para compartilhamento entre `admin` e `operator`.
2. Adicionar telemetria de erros de fallback (para detectar drift de schema em produção).
3. Criar testes de integração para:
   - operador com `transaction_receipts` ausente
   - operador com `companies` parcialmente indisponível
   - render do cockpit sem travar.

# Prompt para Builder de App (Lovable/Bolt/Replit)

Crie um sistema web chamado **Guichê Gestão** com tema profissional escuro/azul, foco em operação rápida.

## Tecnologias
- Next.js + TypeScript + Tailwind
- Supabase Auth + Postgres + Storage
- Componentes acessíveis e mobile-first

## Perfis
1. Admin: acesso total
2. Operador: acesso somente ao próprio guichê/turno e sem edição de valores já lançados

## Telas obrigatórias
1. Login
2. Seletor de Guichê (operador abre turno)
3. Painel Operador
   - botão "Novo lançamento"
   - lista de lançamentos do turno
   - resumo por método (PIX/Crédito/Débito/Dinheiro)
   - alerta de comprovante faltando
   - botão "Encerrar turno"
4. Modal Novo Lançamento
   - empresa
   - valor
   - método de pagamento
   - referência da passagem (opcional)
   - observação
   - upload obrigatório de comprovante para crédito/débito
5. Painel Admin
   - cards de total do dia
   - tabela por guichê (abertos/fechados)
   - filtros por data/guichê/operador
   - relatório de divergências
6. Cadastros (Admin)
   - empresas (% comissão)
   - guichês
   - operadores e vínculo de guichê

## Regras de negócio
- Ao login do operador, abrir turno (se não houver aberto).
- Somente um turno aberto por operador.
- Crédito/débito exige comprovante.
- comissão = valor * % empresa (automático)
- Operador não pode editar/excluir transação lançada.
- Admin pode aprovar ajuste via solicitação.

## Banco de dados
Use o schema SQL em `supabase/schema.sql`.

## UX
- Interface enxuta para balcão
- Botões grandes e rápidos
- Busca e filtros instantâneos
- Estados visuais claros (turno aberto/fechado, pendências)

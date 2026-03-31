# Guichê Gestão — MVP Inicial

Sistema de gestão operacional para guichês de venda de passagem (sem emissão de bilhete), com controle de turno, lançamentos por forma de pagamento, comprovantes e fechamento diário.

## Stack atual
- Frontend: Next.js 16 + React 18 + Tailwind
- Backend/Auth/DB/Storage: Supabase
- Deploy: Vercel

## Escopo deste MVP
- Perfis: `admin` e `operator`
- Login por e-mail/senha
- Abertura automática de turno no login do operador
- Encerramento de turno com resumo e validações
- Lançamentos: PIX, crédito, débito (dinheiro opcional)
- Comprovante obrigatório para crédito/débito
- Cadastro de empresas com `%` de comissão/repasse
- Cálculo automático de comissão por transação
- Relatórios por guichê, operador, período e empresa

## Banco de dados
Use o arquivo `supabase/schema.sql` no SQL Editor do Supabase.

## Rotas ativas
- `/`
- `/login`
- `/rebuild/admin`
- `/rebuild/auditoria`
- `/rebuild/financeiro`
- `/rebuild/operator`
- `/rebuild/operadores`
- `/rebuild/terminais`

## Variáveis de ambiente (web)
```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

> Nunca exponha `SERVICE_ROLE_KEY` no frontend.

## Próximos passos
1. Rodar SQL no Supabase
2. Criar bucket `payment-receipts` (privado)
3. Criar primeiro usuário admin no Auth
4. Inserir role admin na tabela `profiles`
5. Subir frontend e conectar domínio

## Recuperação rápida (banco resetado)

Se `/rebuild/admin` ou `/rebuild/operator` estiverem quebrando após reset de banco:

1. Rode `supabase/migrations/2026-03-01-recovery-bootstrap.sql` no SQL Editor.
2. Siga `RECOVERY.md` para criar perfis/vínculos e validar os fluxos.


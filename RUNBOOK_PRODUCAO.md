# Runbook de Produção — Central Viagens

Objetivo: impedir deploy incorreto e recuperar rápido em caso de incidente.

## Regra de ouro
- Produção sai **somente da branch `main`**.
- Não fazer deploy manual com branch diferente.

## Deploy seguro (padrão oficial)
No PowerShell, dentro do repositório atual:

```powershell
cd "<caminho-do-repo>\uiche-gestao-novo"
npm run typecheck
npm run build
npm run deploy:safe
```

O fluxo deve bloquear publicação se:
- não estiver em `main`
- houver arquivos locais pendentes
- `git pull --ff-only` falhar
- `npm run typecheck` falhar
- `npm run build` falhar

## Pré-check rápido
```powershell
git branch --show-current
git status
npm run typecheck
npm run build
```
Esperado:
- branch: `main`
- status limpo
- validação local sem erro

## Reset operacional antes da entrega
> Faça backup do banco antes de limpar os testes.

1. Execute `scripts/reset-go-live.sql` no **Supabase SQL Editor** para zerar vendas, turnos, caixa, comprovantes e chat de teste sem apagar cadastros-base.
2. Rode `npm run storage:setup` para garantir os buckets privados `payment-receipts` e `chat-attachments`.
3. Valide login, turno e chat privado já no ambiente limpo.

## Rotas para validar após deploy
- `/login`
- `/rebuild/admin`
- `/rebuild/operator`

## Pós-deploy
- Validar domínio/preview publicado
- Fazer hard refresh no navegador (`Ctrl + Shift + R`) se necessário

## Incidente / rollback rápido
1. Identificar commit ruim (ex: `abc1234`)
2. Reverter com commit novo:
```powershell
git checkout main
git pull --ff-only
git revert --no-edit abc1234
git push origin main
npm run deploy:safe
```

## Guardrails no GitHub (obrigatório)
- Default branch: `main`
- Branch protection na `main`:
  - Require pull request before merging
  - Require status checks to pass
  - Restrict who can push (somente responsáveis)

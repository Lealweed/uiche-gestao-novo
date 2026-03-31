# Runbook de Produção (Central Viagens)

Objetivo: impedir deploy errado e recuperar rápido em caso de incidente.

## Regra de ouro
- Produção sai **somente da branch `main`**.
- Não fazer deploy manual com branch diferente.

## Deploy seguro (padrão oficial)
No PowerShell, dentro do projeto:

```powershell
cd "C:\Users\Maico\.openclaw\workspace\guiche-system"
.\scripts\deploy-safe.ps1
```

O script bloqueia deploy se:
- não estiver em `main`
- houver arquivos locais pendentes
- `git pull --ff-only` falhar
- `npm run build` falhar

## Pré-check rápido (30s)
```powershell
git branch --show-current
git status
```
Esperado:
- branch: `main`
- status limpo

## Pós-deploy
- Validar domínio: https://www.centralviagens.site
- Hard refresh no navegador (`Ctrl + Shift + R`) se necessário

## Incidente / rollback rápido
1. Identificar commit ruim (ex: `abc1234`)
2. Reverter com commit novo:
```powershell
git checkout main
git pull
git revert --no-edit abc1234
git push origin main
.\scripts\deploy-safe.ps1
```

## Guardrails no GitHub (obrigatório)
- Default branch: `main`
- Branch protection na `main`:
  - Require pull request before merging
  - Require status checks to pass
  - Restrict who can push (somente responsáveis)

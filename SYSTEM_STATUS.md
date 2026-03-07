# SYSTEM_STATUS.md — Central Viagens

## Estado oficial de rotas (mar/2026)

### Produção ativa
- `/v2/admin` → painel administrativo oficial
- `/v2/operacoes` → operações (admin)
- `/v2/financeiro` → financeiro
- `/v2/relatorios` → relatórios
- `/v2/configuracoes` → configurações
- `/v3/operator` → portal do operador oficial

### Compatibilidade (legado)
- `/admin` redireciona para `/v2/admin`
- `/operator` redireciona para `/v3/operator`
- `/rebuild/admin` redireciona para `/v2/admin`
- `/rebuild/financeiro` redireciona para `/v2/financeiro`
- `/rebuild/operator` redireciona para `/v3/operator`

## Diretriz
Não criar novas funcionalidades em rotas `/rebuild/*`.
Toda evolução nova deve entrar em `/v2/*` (admin) e `/v3/operator` (operador).

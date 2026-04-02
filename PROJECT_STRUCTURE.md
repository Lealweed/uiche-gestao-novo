# Estrutura oficial do projeto

## Árvore principal ativa
A árvore oficial de rotas do projeto é `app/`.

Rotas oficiais atuais:
- `/`
- `/login`
- `/rebuild/admin`
- `/rebuild/operator`
- `/api/admin/users`
- `/api/repasse/baixar`

## Legado isolado
- `src/app/gerencia` está mantido apenas como referência histórica.
- Esse módulo **não faz parte do fluxo operacional principal** e **não deve receber novas features ativas**.
- Enquanto não houver remoção controlada ou migração formal, ele deve ser tratado como legado/inativo.

## Regra prática para desenvolvimento
- Novas páginas, layouts e rotas ativas devem ser criadas em `app/`.
- `src/app/` não é a árvore oficial de navegação atual.

## Warning de lockfiles
O build pode avisar sobre múltiplos `package-lock.json` porque existe um lockfile no diretório pai do repositório (`F:\guiche-novo\package-lock.json`).

Mitigação atual de baixo risco:
- `next.config.mjs` passou a fixar a raiz do Turbopack no diretório deste projeto.

Ação futura opcional:
- remover ou reorganizar o lockfile do diretório pai, caso ele não seja mais necessário.

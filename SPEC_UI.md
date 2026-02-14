# Central Viagens — UI Spec (ShoppingCell-like)

## Paleta
- Background: `#020617` (slate-950)
- Cards: `rgba(255,255,255,0.05)`
- Border: `rgba(255,255,255,0.10)`
- Text: `#E2E8F0` / `#94A3B8`
- Confirmar/Ação: verde (emerald)
- Valores/Destaque: amarelo (yellow/amber)
- Perigo: vermelho (red)

## CSS/Classes padrão
- `.glass-card`: borda sutil + bg sutil + hover leve (sem glow)
- `.btn-primary`: verde, sem gradiente neon
- `.btn-ghost`: discreto
- `.field`: input escuro com focus emerald
- Títulos: sem gradient neon

## Layout das telas
Toda tela do admin deve ter:
- Cabeçalho (título + subtítulo)
- Filtros (quando existir)
- Conteúdo (tabela desktop / cards mobile)
- Estados: vazio, erro, carregando

## Menu (Admin)
- Dashboard
- Operadores
- Gestão
- Financeiro
- Relatórios
- Configurações

## Padrão Mobile
- No mobile: cards com ações grandes (44px)
- No desktop: tabela e filtros na horizontal

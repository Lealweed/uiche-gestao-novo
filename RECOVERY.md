# RECOVERY.md

## Modo Recuperação (admin/operator rebuild)

Quando o banco estiver recém-resetado, aplique primeiro o bootstrap abaixo para destravar os fluxos.

## 1) Aplicar SQL de recuperação

No Supabase SQL Editor, execute:

- `supabase/migrations/2026-03-01-recovery-bootstrap.sql`

Esse script recria estrutura mínima para:
- Admin: dashboard, controle de turno, histórico, relatórios, usuários, configurações (CRUDs)
- Operador: abrir turno, lançar venda, anexar comprovante, caixa PDV, encerrar turno

## 2) Preparar usuários (Auth)

1. Crie usuários no **Auth > Users** (admin e operador).
2. Garanta linha em `public.profiles` para cada `auth.users.id`.
3. Defina `role` (`admin` / `operator`) e `active=true`.

Exemplo:
```sql
insert into public.profiles (user_id, full_name, role, active)
values ('UUID_DO_USUARIO', 'Nome', 'admin', true)
on conflict (user_id) do update
set role = excluded.role,
    active = excluded.active,
    full_name = excluded.full_name;
```

## 3) Vincular operador ao guichê

```sql
insert into public.operator_booths (operator_id, booth_id, active)
select 'UUID_OPERADOR', b.id, true
from public.booths b
where b.code = 'G1'
on conflict (operator_id, booth_id) do update set active = true;
```

## 4) Validar fluxos

### Admin (`/rebuild/admin`)
- Menu: Dashboard, Controle de Turno, Histórico, Relatórios, Usuários, Configurações
- CRUDs: empresas, guichês, categorias, subcategorias, usuários (role/active), vínculos operador↔guichê

### Operador (`/rebuild/operator`)
- Abrir turno
- Lançar venda
- Anexar comprovante
- Anexar imagem/arquivo no chat privado com o admin
- Caixa PDV (suprimento/sangria/ajuste)
- Encerrar turno

## 5) Se aparecer aviso por seção no front

Isso indica dependência de banco ausente ou incompleta. Ação recomendada:
1. Reaplicar o SQL de recovery.
2. Verificar se tabelas/rpcs existem: `profiles`, `shifts`, `transactions`, `cash_movements`, `time_punches`, `transaction_receipts`, `operator_messages`, `open_shift`, `close_shift` e os buckets `payment-receipts` e `chat-attachments`.
3. Recarregar a página.

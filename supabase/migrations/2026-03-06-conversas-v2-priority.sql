-- Conversas v2: prioridade de mensagem
alter table if exists public.operator_admin_messages
  add column if not exists priority text not null default 'normal';

alter table if exists public.operator_admin_messages
  drop constraint if exists operator_admin_messages_priority_check;

alter table if exists public.operator_admin_messages
  add constraint operator_admin_messages_priority_check
  check (priority in ('normal', 'alta', 'urgente'));

create index if not exists idx_operator_admin_messages_unread
  on public.operator_admin_messages(tenant_id, read_at, created_at desc);

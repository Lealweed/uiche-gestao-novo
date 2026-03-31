-- Conversas: permitir direcionar mensagem do admin para guichê específico
alter table if exists public.operator_admin_messages
  add column if not exists target_booth_id uuid references public.booths(id) on delete set null;

create index if not exists idx_operator_admin_messages_target_booth
  on public.operator_admin_messages(target_booth_id, created_at desc);

-- =============================================================
-- Cria tabela operator_messages para o chat Operador <-> Admin
-- Roda no SQL Editor do Supabase
-- =============================================================

create table if not exists public.operator_messages (
  id          uuid        primary key default gen_random_uuid(),
  operator_id uuid        not null references public.profiles(user_id) on delete cascade,
  message     text        not null check (char_length(message) > 0 and char_length(message) <= 2000),
  read        boolean     not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists operator_messages_operator_idx on public.operator_messages(operator_id);
create index if not exists operator_messages_created_idx  on public.operator_messages(created_at desc);

alter table public.operator_messages enable row level security;

-- Operador pode ver e inserir apenas suas proprias mensagens
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'operator_messages'
      and policyname = 'op_messages_self_select'
  ) then
    create policy op_messages_self_select on public.operator_messages
      for select using (operator_id = auth.uid() or public.is_admin(auth.uid()));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'operator_messages'
      and policyname = 'op_messages_self_insert'
  ) then
    create policy op_messages_self_insert on public.operator_messages
      for insert with check (operator_id = auth.uid());
  end if;

  -- Admin pode marcar como lida (update)
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'operator_messages'
      and policyname = 'op_messages_admin_update'
  ) then
    create policy op_messages_admin_update on public.operator_messages
      for update using (public.is_admin(auth.uid()))
      with check (public.is_admin(auth.uid()));
  end if;
end $$;

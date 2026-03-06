-- Portal de conversa Operador <-> Admin com isolamento por tenant

create table if not exists public.operator_admin_messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  sender_user_id uuid not null references auth.users(id) on delete cascade,
  sender_role text not null check (sender_role in ('operator', 'tenant_admin', 'admin', 'financeiro')),
  body text not null check (char_length(trim(body)) between 1 and 1200),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_operator_admin_messages_tenant_created
  on public.operator_admin_messages(tenant_id, created_at desc);

create index if not exists idx_operator_admin_messages_sender
  on public.operator_admin_messages(sender_user_id, created_at desc);

alter table public.operator_admin_messages enable row level security;

-- Leitura: usuários do mesmo tenant; operadores veem mensagens do tenant para viabilizar a conversa
create policy if not exists "operator_admin_messages_select"
  on public.operator_admin_messages
  for select
  using (
    tenant_id = public.current_tenant_id()
    and auth.uid() is not null
  );

-- Escrita: usuário autenticado escreve apenas no próprio user_id e tenant atual
create policy if not exists "operator_admin_messages_insert"
  on public.operator_admin_messages
  for insert
  with check (
    tenant_id = public.current_tenant_id()
    and sender_user_id = auth.uid()
    and auth.uid() is not null
  );

-- Atualização de leitura: apenas perfis administrativos
create policy if not exists "operator_admin_messages_update_admin"
  on public.operator_admin_messages
  for update
  using (
    tenant_id = public.current_tenant_id()
    and public.has_role(array['tenant_admin', 'admin'])
  )
  with check (
    tenant_id = public.current_tenant_id()
    and public.has_role(array['tenant_admin', 'admin'])
  );

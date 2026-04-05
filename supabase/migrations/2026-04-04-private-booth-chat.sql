-- Conversa privada admin <-> guiche com historico por guiche

alter table public.operator_messages
  add column if not exists booth_id uuid references public.booths(id) on delete set null;

alter table public.operator_messages
  add column if not exists sender_role text;

update public.operator_messages
set sender_role = coalesce(sender_role, 'operator')
where sender_role is null;

alter table public.operator_messages
  alter column sender_role set default 'operator';

update public.operator_messages om
set booth_id = linked.booth_id
from (
  select distinct on (ob.operator_id)
    ob.operator_id,
    ob.booth_id
  from public.operator_booths ob
  where ob.active = true
  order by ob.operator_id, ob.id desc
) linked
where om.operator_id = linked.operator_id
  and om.booth_id is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'operator_messages_sender_role_check'
  ) then
    alter table public.operator_messages
      add constraint operator_messages_sender_role_check
      check (sender_role in ('operator', 'admin'));
  end if;
end $$;

alter table public.operator_messages
  alter column sender_role set not null;

create index if not exists idx_operator_messages_booth_id
  on public.operator_messages(booth_id);

create index if not exists idx_operator_messages_conversation
  on public.operator_messages(operator_id, booth_id, created_at desc);

drop policy if exists "Operadores podem inserir mensagens" on public.operator_messages;
create policy "Operadores podem inserir mensagens"
  on public.operator_messages
  for insert
  to authenticated
  with check (
    auth.uid() = operator_id
    and sender_role = 'operator'
  );

drop policy if exists "Operadores podem atualizar mensagens" on public.operator_messages;
create policy "Operadores podem atualizar mensagens"
  on public.operator_messages
  for update
  to authenticated
  using (auth.uid() = operator_id)
  with check (auth.uid() = operator_id);

drop policy if exists "Admins podem inserir mensagens" on public.operator_messages;
create policy "Admins podem inserir mensagens"
  on public.operator_messages
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.user_id = auth.uid()
        and profiles.role = 'admin'
    )
    and sender_role = 'admin'
  );

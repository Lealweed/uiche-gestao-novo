-- Anexos no chat privado admin <-> guiche

alter table public.operator_messages
  add column if not exists attachment_path text,
  add column if not exists attachment_name text,
  add column if not exists attachment_type text,
  add column if not exists attachment_size bigint;

insert into storage.buckets (id, name, public)
values ('chat-attachments', 'chat-attachments', false)
on conflict (id) do nothing;

drop policy if exists "Chat attachments upload own folder or admin" on storage.objects;
create policy "Chat attachments upload own folder or admin"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'chat-attachments'
    and (
      split_part(name, '/', 1) = auth.uid()::text
      or public.is_admin(auth.uid())
    )
  );

drop policy if exists "Chat attachments select own folder or admin" on storage.objects;
create policy "Chat attachments select own folder or admin"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'chat-attachments'
    and (
      split_part(name, '/', 1) = auth.uid()::text
      or public.can_read_admin_data(auth.uid())
    )
  );

drop policy if exists "Chat attachments update own folder or admin" on storage.objects;
create policy "Chat attachments update own folder or admin"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'chat-attachments'
    and (
      split_part(name, '/', 1) = auth.uid()::text
      or public.is_admin(auth.uid())
    )
  )
  with check (
    bucket_id = 'chat-attachments'
    and (
      split_part(name, '/', 1) = auth.uid()::text
      or public.is_admin(auth.uid())
    )
  );

drop policy if exists "Chat attachments delete own folder or admin" on storage.objects;
create policy "Chat attachments delete own folder or admin"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'chat-attachments'
    and (
      split_part(name, '/', 1) = auth.uid()::text
      or public.is_admin(auth.uid())
    )
  );

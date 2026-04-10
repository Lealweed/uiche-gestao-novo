const { Client } = require('pg');

const client = new Client({
  host: 'aws-1-sa-east-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.txswessunrkuvsexxjuu',
  password: 'Deus2026!@#$',
  ssl: { rejectUnauthorized: false },
});

(async () => {
  await client.connect();

  await client.query(`
    do $$
    begin
      if exists (select 1 from pg_type where typname = 'app_role') then
        begin alter type public.app_role add value if not exists 'tenant_admin'; exception when duplicate_object then null; end;
        begin alter type public.app_role add value if not exists 'financeiro'; exception when duplicate_object then null; end;
      end if;
    end $$;

    create or replace function public.can_read_admin_data(uid uuid)
    returns boolean
    language sql
    stable
    as $$
      select exists(
        select 1
        from public.profiles
        where user_id = uid
          and active = true
          and role::text in ('admin', 'tenant_admin', 'financeiro')
      );
    $$;

    grant execute on function public.can_read_admin_data(uuid) to authenticated;

    insert into storage.buckets (id, name, public)
    values
      ('payment-receipts', 'payment-receipts', false),
      ('chat-attachments', 'chat-attachments', false)
    on conflict (id) do nothing;

    drop policy if exists "Receipts upload own folder" on storage.objects;
    create policy "Receipts upload own folder"
      on storage.objects for insert to authenticated
      with check (
        bucket_id = 'payment-receipts'
        and split_part(name, '/', 1) = auth.uid()::text
      );

    drop policy if exists "Receipts select own folder or admin" on storage.objects;
    create policy "Receipts select own folder or admin"
      on storage.objects for select to authenticated
      using (
        bucket_id = 'payment-receipts'
        and (
          split_part(name, '/', 1) = auth.uid()::text
          or public.can_read_admin_data(auth.uid())
        )
      );

    drop policy if exists "Receipts update own folder" on storage.objects;
    create policy "Receipts update own folder"
      on storage.objects for update to authenticated
      using (
        bucket_id = 'payment-receipts'
        and split_part(name, '/', 1) = auth.uid()::text
      )
      with check (
        bucket_id = 'payment-receipts'
        and split_part(name, '/', 1) = auth.uid()::text
      );

    drop policy if exists "Receipts delete own folder or admin" on storage.objects;
    create policy "Receipts delete own folder or admin"
      on storage.objects for delete to authenticated
      using (
        bucket_id = 'payment-receipts'
        and (
          split_part(name, '/', 1) = auth.uid()::text
          or public.is_admin(auth.uid())
        )
      );

    drop policy if exists "Chat attachments upload own folder or admin" on storage.objects;
    create policy "Chat attachments upload own folder or admin"
      on storage.objects for insert to authenticated
      with check (
        bucket_id = 'chat-attachments'
        and (
          split_part(name, '/', 1) = auth.uid()::text
          or public.is_admin(auth.uid())
        )
      );

    drop policy if exists "Chat attachments select own folder or admin" on storage.objects;
    create policy "Chat attachments select own folder or admin"
      on storage.objects for select to authenticated
      using (
        bucket_id = 'chat-attachments'
        and (
          split_part(name, '/', 1) = auth.uid()::text
          or public.can_read_admin_data(auth.uid())
        )
      );

    drop policy if exists "Chat attachments update own folder or admin" on storage.objects;
    create policy "Chat attachments update own folder or admin"
      on storage.objects for update to authenticated
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
      on storage.objects for delete to authenticated
      using (
        bucket_id = 'chat-attachments'
        and (
          split_part(name, '/', 1) = auth.uid()::text
          or public.is_admin(auth.uid())
        )
      );
  `);

  console.log('STORAGE_SETUP_OK');
  await client.end();
})().catch(async (e) => {
  console.error('STORAGE_SETUP_ERROR');
  console.error(e.message);
  try { await client.end(); } catch {}
  process.exit(1);
});

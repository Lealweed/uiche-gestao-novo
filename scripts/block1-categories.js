const { createDbClient } = require('./db-client');

const client = createDbClient();

(async () => {
  await client.connect();

  await client.query(`
    create table if not exists public.transaction_categories (
      id uuid primary key default gen_random_uuid(),
      name text not null unique,
      active boolean not null default true,
      created_at timestamptz not null default now()
    );

    create table if not exists public.transaction_subcategories (
      id uuid primary key default gen_random_uuid(),
      category_id uuid not null references public.transaction_categories(id) on delete cascade,
      name text not null,
      active boolean not null default true,
      created_at timestamptz not null default now(),
      unique(category_id, name)
    );

    alter table public.transactions add column if not exists category_id uuid references public.transaction_categories(id);
    alter table public.transactions add column if not exists subcategory_id uuid references public.transaction_subcategories(id);

    create index if not exists transactions_category_idx on public.transactions(category_id);
    create index if not exists transactions_subcategory_idx on public.transactions(subcategory_id);

    alter table public.transaction_categories enable row level security;
    alter table public.transaction_subcategories enable row level security;

    drop policy if exists tx_categories_read_authenticated on public.transaction_categories;
    create policy tx_categories_read_authenticated on public.transaction_categories
      for select using (auth.uid() is not null);

    drop policy if exists tx_categories_admin_write on public.transaction_categories;
    create policy tx_categories_admin_write on public.transaction_categories
      for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

    drop policy if exists tx_subcategories_read_authenticated on public.transaction_subcategories;
    create policy tx_subcategories_read_authenticated on public.transaction_subcategories
      for select using (auth.uid() is not null);

    drop policy if exists tx_subcategories_admin_write on public.transaction_subcategories;
    create policy tx_subcategories_admin_write on public.transaction_subcategories
      for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
  `);

  await client.query(`
    insert into public.transaction_categories(name,active)
    values ('Venda de Passagem',true),('Serviços',true),('Taxas',true),('Reembolso',true)
    on conflict (name) do nothing;
  `);

  await client.query(`
    insert into public.transaction_subcategories(category_id,name,active)
    select c.id, s.name, true
    from public.transaction_categories c
    join (
      values
        ('Venda de Passagem','Interestadual'),
        ('Venda de Passagem','Intermunicipal'),
        ('Serviços','Encomenda'),
        ('Serviços','Taxa Embarque'),
        ('Taxas','Tarifa Administrativa'),
        ('Reembolso','Cancelamento')
    ) as s(cat,name) on s.cat=c.name
    on conflict (category_id,name) do nothing;
  `);

  console.log('BLOCK1_DB_OK');
  await client.end();
})().catch(async (e) => {
  console.error('BLOCK1_DB_ERROR');
  console.error(e.message);
  try { await client.end(); } catch {}
  process.exit(1);
});

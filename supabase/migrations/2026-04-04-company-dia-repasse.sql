alter table if exists public.companies
  add column if not exists dia_repasse smallint;

alter table if exists public.companies
  drop constraint if exists companies_dia_repasse_check;

alter table if exists public.companies
  add constraint companies_dia_repasse_check
  check (dia_repasse is null or (dia_repasse between 1 and 31));

comment on column public.companies.dia_repasse is
  'Dia previsto do mes para repasse financeiro da empresa (1 a 31).';

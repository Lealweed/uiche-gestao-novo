-- Reset operacional para a entrega oficial
-- Preserva cadastros-base: profiles, booths, operator_booths, companies,
-- categorias/subcategorias e configuracoes.
-- IMPORTANTE: faça backup antes de executar em producao.

begin;

-- Observacao: a limpeza fisica dos arquivos privados deve ser feita pela Storage API.
-- Para o go-live, este reset zera os registros operacionais e remove as referencias no banco.

-- Limpa somente dados operacionais / financeiros gerados em homologacao.
do $$
begin
  if to_regclass('public.operator_messages') is not null then execute 'truncate table public.operator_messages restart identity cascade'; end if;
  if to_regclass('public.audit_logs') is not null then execute 'truncate table public.audit_logs restart identity cascade'; end if;
  if to_regclass('public.adjustment_requests') is not null then execute 'truncate table public.adjustment_requests restart identity cascade'; end if;
  if to_regclass('public.transaction_receipts') is not null then execute 'truncate table public.transaction_receipts restart identity cascade'; end if;
  if to_regclass('public.transactions') is not null then execute 'truncate table public.transactions restart identity cascade'; end if;
  if to_regclass('public.cash_movements') is not null then execute 'truncate table public.cash_movements restart identity cascade'; end if;
  if to_regclass('public.shift_cash_closings') is not null then execute 'truncate table public.shift_cash_closings restart identity cascade'; end if;
  if to_regclass('public.time_punches') is not null then execute 'truncate table public.time_punches restart identity cascade'; end if;
  if to_regclass('public.user_attendance') is not null then execute 'truncate table public.user_attendance restart identity cascade'; end if;
  if to_regclass('public.shifts') is not null then execute 'truncate table public.shifts restart identity cascade'; end if;
end $$;

-- Opcional: descomente se ainda houver clientes ficticios cadastrados.
-- delete from public.clients
-- where lower(coalesce(name, '')) like '%teste%'
--    or lower(coalesce(name, '')) like '%test%'
--    or lower(coalesce(email, '')) like '%teste%'
--    or lower(coalesce(email, '')) like '%test%';

commit;

-- Verificacao final pode ser feita com consultas separadas apos a execucao.

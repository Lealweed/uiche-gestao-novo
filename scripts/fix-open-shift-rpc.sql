-- =============================================================
-- FIX: Recria open_shift e close_shift sem colunas de IP
-- A coluna opened_by_ip / closed_by_ip NAO existe no banco de producao.
-- Roda no SQL Editor do Supabase
-- =============================================================

-- 1) open_shift — sem opened_by_ip
create or replace function public.open_shift(p_booth_id uuid, p_ip text default null)
returns public.shifts
language plpgsql
security definer
set search_path = public
as $$
declare
  s       public.shifts;
  allowed boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Nao autenticado';
  end if;

  -- Admin pode abrir qualquer turno; operador precisa estar vinculado ao guiche
  if public.is_admin(auth.uid()) then
    allowed := true;
  else
    select exists (
      select 1 from public.operator_booths ob
      where ob.operator_id = auth.uid()
        and ob.booth_id    = p_booth_id
        and ob.active      = true
    ) into allowed;
  end if;

  if not allowed then
    raise exception 'Operador sem permissao para este guiche';
  end if;

  -- Nao inclui opened_by_ip pois a coluna nao existe em producao
  insert into public.shifts (booth_id, operator_id)
  values (p_booth_id, auth.uid())
  returning * into s;

  return s;
end;
$$;

-- 2) close_shift — sem closed_by_ip
create or replace function public.close_shift(p_shift_id uuid, p_ip text default null, p_notes text default null)
returns public.shifts
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.shifts;
begin
  if auth.uid() is null then
    raise exception 'Nao autenticado';
  end if;

  -- Nao inclui closed_by_ip pois a coluna nao existe em producao
  update public.shifts
  set status    = 'closed',
      closed_at = now(),
      notes     = coalesce(p_notes, notes)
  where id       = p_shift_id
    and status   = 'open'
    and (operator_id = auth.uid() or public.is_admin(auth.uid()))
  returning * into s;

  if s.id is null then
    raise exception 'Turno nao encontrado, ja fechado ou sem permissao';
  end if;

  return s;
end;
$$;

-- Regarante as permissoes
grant execute on function public.open_shift(uuid, text)        to authenticated;
grant execute on function public.close_shift(uuid, text, text) to authenticated;

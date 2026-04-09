-- Shift control hardening
-- Safe improvements for turno opening/closing governance

create unique index if not exists shifts_one_open_per_booth
on public.shifts(booth_id)
where status = 'open';

create or replace function public.open_shift(p_booth_id uuid, p_ip text default null)
returns public.shifts
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.shifts;
  allowed boolean;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  if public.is_admin(auth.uid()) then
    allowed := true;
  else
    select exists (
      select 1 from public.operator_booths ob
      where ob.operator_id = auth.uid()
        and ob.booth_id = p_booth_id
        and ob.active = true
    ) into allowed;
  end if;

  if not allowed then
    raise exception 'Operador sem permissão para este guichê';
  end if;

  if exists (
    select 1 from public.shifts open_shift_row
    where open_shift_row.booth_id = p_booth_id
      and open_shift_row.status = 'open'
  ) then
    raise exception 'Já existe um turno aberto neste guichê';
  end if;

  insert into public.shifts (booth_id, operator_id, opened_by_ip)
  values (p_booth_id, auth.uid(), p_ip)
  returning * into s;

  return s;
end;
$$;

create or replace function public.close_shift(p_shift_id uuid, p_ip text default null, p_notes text default null)
returns public.shifts
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.shifts;
begin
  if not exists (
    select 1 from public.shift_cash_closings closing_row
    where closing_row.shift_id = p_shift_id
  ) then
    raise exception 'Registre o fechamento de caixa antes de encerrar o turno';
  end if;

  update public.shifts
  set status = 'closed',
      closed_at = now(),
      closed_by_ip = p_ip,
      notes = coalesce(p_notes, notes)
  where id = p_shift_id
    and status = 'open'
    and (
      operator_id = auth.uid()
      or public.is_admin(auth.uid())
    )
  returning * into s;

  if s.id is null then
    raise exception 'Turno não encontrado, já fechado ou sem permissão';
  end if;

  return s;
end;
$$;

drop policy if exists shift_cash_closings_self_insert on public.shift_cash_closings;
create policy shift_cash_closings_self_insert on public.shift_cash_closings
for insert with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.shifts s
    where s.id = shift_cash_closings.shift_id
      and s.operator_id = auth.uid()
      and s.status = 'open'
  )
);

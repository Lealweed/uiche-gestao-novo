-- Adiciona constraint para garantir que closed_at > opened_at
-- Safe: usa DO block para verificar existência antes de criar

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'shift_close_after_open'
  ) then
    alter table public.shifts
      add constraint shift_close_after_open
      check (closed_at is null or closed_at > opened_at);
  end if;
end $$;

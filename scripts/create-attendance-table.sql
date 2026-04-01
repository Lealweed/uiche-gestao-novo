-- ============================================================
-- Tabela: user_attendance (Ponto Digital / HR)
-- Registra clock_in (login) e clock_out (logout) dos operadores,
-- independente dos turnos de caixa (shifts).
-- ============================================================

create table if not exists public.user_attendance (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(user_id) on delete cascade,
  clock_in   timestamptz not null default now(),
  clock_out  timestamptz,
  created_at timestamptz not null default now()
);

-- Indice para buscas por usuario e data
create index if not exists idx_attendance_user_date
  on public.user_attendance (user_id, clock_in desc);

-- ============================================================
-- RLS
-- ============================================================
alter table public.user_attendance enable row level security;

-- Operador pode inserir o proprio registro
create policy "Operador insere proprio ponto"
  on public.user_attendance for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Operador pode atualizar (clock_out) apenas a propria linha
create policy "Operador atualiza proprio ponto"
  on public.user_attendance for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Operador pode ler apenas os proprios registros
create policy "Operador le proprio ponto"
  on public.user_attendance for select
  to authenticated
  using (auth.uid() = user_id);

-- Admin pode ler todos os registros
-- (depende da coluna role na tabela profiles; caso use outra logica, ajuste)
create policy "Admin le todos os pontos"
  on public.user_attendance for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.user_id = auth.uid()
        and profiles.role = 'admin'
    )
  );

-- Habilitar Realtime para a tabela (opcional)
alter publication supabase_realtime add table public.user_attendance;

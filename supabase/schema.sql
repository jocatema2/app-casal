-- A Dois: esquema da base de dados (Supabase / Postgres).
-- Corre este ficheiro inteiro em: Supabase → SQL Editor → New query → Run.
-- Pode ser corrido mais do que uma vez sem estragar nada.

-- 1) Quem pode entrar. SUBSTITUI pelos vossos dois emails antes de correr.
create table if not exists public.members (email text primary key);
insert into public.members (email) values
  ('jose@exemplo.pt'),
  ('carolina@exemplo.pt')
on conflict do nothing;
alter table public.members enable row level security; -- sem políticas: a app nunca lê esta tabela

create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where lower(email) = lower(auth.jwt() ->> 'email'));
$$;

-- 2) Tabelas
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
alter table public.profiles add column if not exists theme text not null default 'lilac'; -- cores escolhidas por cada um

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  date date not null default current_date,
  description text not null,
  amount numeric(10,2) not null check (amount > 0),
  category text not null default 'Outros',
  paid_by uuid not null references public.profiles,
  share_payer numeric(4,3) not null default 0.5 check (share_payer between 0 and 1), -- parte de quem pagou
  kind text not null default 'expense' check (kind in ('expense', 'settlement'))
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null,
  assignee uuid references public.profiles,
  due date,
  repeat text not null default 'none' check (repeat in ('none', 'daily', 'weekly', 'monthly')),
  done boolean not null default false,
  done_at timestamptz
);

create table if not exists public.stock_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  category text not null default 'Outros',
  quantity numeric(10,2) not null default 0 check (quantity >= 0),
  unit text not null default 'un',
  min_quantity numeric(10,2) not null default 0 check (min_quantity >= 0)
);

-- 3) Segurança: só os emails em "members" leem ou escrevem
alter table public.profiles enable row level security;
alter table public.expenses enable row level security;
alter table public.tasks enable row level security;
alter table public.stock_items enable row level security;

drop policy if exists "members read profiles" on public.profiles;
drop policy if exists "members insert own profile" on public.profiles;
drop policy if exists "members update own profile" on public.profiles;
create policy "members read profiles" on public.profiles for select to authenticated using (public.is_member());
create policy "members insert own profile" on public.profiles for insert to authenticated with check (public.is_member() and id = auth.uid());
create policy "members update own profile" on public.profiles for update to authenticated using (public.is_member() and id = auth.uid());

drop policy if exists "members all" on public.expenses;
drop policy if exists "members all" on public.tasks;
drop policy if exists "members all" on public.stock_items;
create policy "members all" on public.expenses for all to authenticated using (public.is_member()) with check (public.is_member());
create policy "members all" on public.tasks for all to authenticated using (public.is_member()) with check (public.is_member());
create policy "members all" on public.stock_items for all to authenticated using (public.is_member()) with check (public.is_member());

-- 4) Atualizações em tempo real (o que um regista aparece no telemóvel do outro)
do $$
declare t text;
begin
  foreach t in array array['profiles', 'expenses', 'tasks', 'stock_items'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

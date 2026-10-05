-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.
-- One shared workspace for the whole company, plus site photos.
create table if not exists public.workspace (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists public.photos (
  id text primary key,
  data text not null,
  created_at timestamptz not null default now()
);
alter table public.workspace enable row level security;
alter table public.photos enable row level security;
create policy "signed-in read"   on public.workspace for select to authenticated using (true);
create policy "signed-in insert" on public.workspace for insert to authenticated with check (true);
create policy "signed-in update" on public.workspace for update to authenticated using (true);
create policy "signed-in read"   on public.photos for select to authenticated using (true);
create policy "signed-in insert" on public.photos for insert to authenticated with check (true);

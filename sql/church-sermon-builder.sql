create extension if not exists pgcrypto;

create table if not exists public.church_sermons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mode text not null default 'church',
  title text not null default '',
  speaker_name text not null default '',
  sermon_date date,
  notes text not null default '',
  default_translation text not null default 'NKJV',
  items jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists church_sermons_user_mode_active_idx
on public.church_sermons (user_id, mode, is_active)
where is_active = true;

create table if not exists public.service_items (
  id uuid primary key default gen_random_uuid(),
  service_id text not null,
  type text not null,
  source_app text not null,
  source_id text not null,
  sort_order integer not null default 1,
  title text not null default '',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.church_sermons enable row level security;
alter table public.service_items enable row level security;

drop policy if exists "church_sermons_select_own" on public.church_sermons;
create policy "church_sermons_select_own"
on public.church_sermons
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "church_sermons_insert_own" on public.church_sermons;
create policy "church_sermons_insert_own"
on public.church_sermons
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "church_sermons_update_own" on public.church_sermons;
create policy "church_sermons_update_own"
on public.church_sermons
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "church_sermons_delete_own" on public.church_sermons;
create policy "church_sermons_delete_own"
on public.church_sermons
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "service_items_read_authenticated" on public.service_items;
create policy "service_items_read_authenticated"
on public.service_items
for select
to authenticated
using (true);

drop policy if exists "service_items_write_authenticated" on public.service_items;
create policy "service_items_write_authenticated"
on public.service_items
for all
to authenticated
using (true)
with check (true);

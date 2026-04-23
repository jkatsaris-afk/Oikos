create table if not exists public.mode_tile_catalog (
  mode text not null,
  tile_id text not null,
  is_enabled boolean not null default true,
  sort_order integer not null default 1,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (mode, tile_id)
);

create table if not exists public.user_mode_tiles (
  user_id uuid not null references auth.users (id) on delete cascade,
  mode text not null,
  tile_id text not null,
  is_installed boolean not null default true,
  is_visible boolean not null default true,
  placement text not null default 'dock',
  sort_order integer not null default 1,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, mode, tile_id)
);

create table if not exists public.user_mode_widgets (
  user_id uuid not null references auth.users (id) on delete cascade,
  mode text not null,
  tile_id text not null,
  is_enabled boolean not null default false,
  sort_order integer not null default 1,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, mode, tile_id)
);

alter table public.mode_tile_catalog enable row level security;
alter table public.user_mode_tiles enable row level security;
alter table public.user_mode_widgets enable row level security;

drop policy if exists "mode_tile_catalog_read_authenticated" on public.mode_tile_catalog;
create policy "mode_tile_catalog_read_authenticated"
on public.mode_tile_catalog
for select
to authenticated
using (true);

drop policy if exists "user_mode_tiles_select_own" on public.user_mode_tiles;
create policy "user_mode_tiles_select_own"
on public.user_mode_tiles
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "user_mode_tiles_insert_own" on public.user_mode_tiles;
create policy "user_mode_tiles_insert_own"
on public.user_mode_tiles
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "user_mode_tiles_update_own" on public.user_mode_tiles;
create policy "user_mode_tiles_update_own"
on public.user_mode_tiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "user_mode_tiles_delete_own" on public.user_mode_tiles;
create policy "user_mode_tiles_delete_own"
on public.user_mode_tiles
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "user_mode_widgets_select_own" on public.user_mode_widgets;
create policy "user_mode_widgets_select_own"
on public.user_mode_widgets
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "user_mode_widgets_insert_own" on public.user_mode_widgets;
create policy "user_mode_widgets_insert_own"
on public.user_mode_widgets
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "user_mode_widgets_update_own" on public.user_mode_widgets;
create policy "user_mode_widgets_update_own"
on public.user_mode_widgets
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "user_mode_widgets_delete_own" on public.user_mode_widgets;
create policy "user_mode_widgets_delete_own"
on public.user_mode_widgets
for delete
to authenticated
using (auth.uid() = user_id);

insert into public.mode_tile_catalog (mode, tile_id, is_enabled, sort_order)
values
  ('admin', 'global-users', true, 1),
  ('church', 'announcements', true, 1),
  ('church', 'sermon', true, 2),
  ('church', 'service', true, 3)
on conflict (mode, tile_id) do update
set
  is_enabled = excluded.is_enabled,
  sort_order = excluded.sort_order,
  updated_at = timezone('utc', now());

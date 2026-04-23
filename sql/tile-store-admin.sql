create extension if not exists pgcrypto;

-- =========================================================
-- TILE STORE ADMIN / GLOBAL TILE STORE BACKBONE
-- Run this after sql/user-mode-tiles.sql
-- =========================================================

-- ---------------------------------------------------------
-- 1. Global app metadata managed by Master Admin
-- ---------------------------------------------------------
create table if not exists public.tile_store_apps (
  tile_id text primary key,
  app_name text not null,
  category text not null default 'Utilities',
  short_description text not null default '',
  full_description text not null default '',
  developer_name text not null default 'Oikos',
  version text not null default '1.0',
  is_globally_enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tile_store_app_features (
  id uuid primary key default gen_random_uuid(),
  tile_id text not null references public.tile_store_apps (tile_id) on delete cascade,
  feature_text text not null,
  sort_order integer not null default 1,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists tile_store_app_features_tile_id_sort_order_idx
on public.tile_store_app_features (tile_id, sort_order);

create table if not exists public.tile_store_app_screenshots (
  id uuid primary key default gen_random_uuid(),
  tile_id text not null references public.tile_store_apps (tile_id) on delete cascade,
  title text not null default '',
  subtitle text not null default '',
  image_path text not null,
  sort_order integer not null default 1,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists tile_store_app_screenshots_tile_id_sort_order_idx
on public.tile_store_app_screenshots (tile_id, sort_order);

create table if not exists public.tile_store_widget_configs (
  tile_id text primary key references public.tile_store_apps (tile_id) on delete cascade,
  primary_stat text not null default '',
  secondary_stat text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- ---------------------------------------------------------
-- 2. Per-mode assignment table for admin control
-- Keeps the existing mode_tile_catalog working.
-- Supported modes can include:
-- home, business, church, campus, sports, edu, nightstand, admin
-- ---------------------------------------------------------
create table if not exists public.tile_store_app_modes (
  tile_id text not null references public.tile_store_apps (tile_id) on delete cascade,
  mode text not null,
  is_enabled boolean not null default true,
  sort_order integer not null default 1,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (tile_id, mode)
);

create index if not exists tile_store_app_modes_mode_idx
on public.tile_store_app_modes (mode, is_enabled, sort_order);

-- ---------------------------------------------------------
-- 3. Sync helper so the current app can keep reading
--    public.mode_tile_catalog without code breakage
-- ---------------------------------------------------------
create or replace function public.sync_mode_tile_catalog_from_store()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.mode_tile_catalog
    where mode = old.mode and tile_id = old.tile_id;
    return old;
  end if;

  insert into public.mode_tile_catalog (mode, tile_id, is_enabled, sort_order, updated_at)
  values (new.mode, new.tile_id, new.is_enabled, new.sort_order, timezone('utc', now()))
  on conflict (mode, tile_id) do update
  set
    is_enabled = excluded.is_enabled,
    sort_order = excluded.sort_order,
    updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists tile_store_app_modes_sync_to_catalog on public.tile_store_app_modes;
create trigger tile_store_app_modes_sync_to_catalog
after insert or update or delete on public.tile_store_app_modes
for each row execute function public.sync_mode_tile_catalog_from_store();

-- ---------------------------------------------------------
-- 4. Updated-at helper
-- ---------------------------------------------------------
create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists tile_store_apps_set_updated_at on public.tile_store_apps;
create trigger tile_store_apps_set_updated_at
before update on public.tile_store_apps
for each row execute function public.set_updated_at_timestamp();

drop trigger if exists tile_store_app_features_set_updated_at on public.tile_store_app_features;
create trigger tile_store_app_features_set_updated_at
before update on public.tile_store_app_features
for each row execute function public.set_updated_at_timestamp();

drop trigger if exists tile_store_app_screenshots_set_updated_at on public.tile_store_app_screenshots;
create trigger tile_store_app_screenshots_set_updated_at
before update on public.tile_store_app_screenshots
for each row execute function public.set_updated_at_timestamp();

drop trigger if exists tile_store_app_modes_set_updated_at on public.tile_store_app_modes;
create trigger tile_store_app_modes_set_updated_at
before update on public.tile_store_app_modes
for each row execute function public.set_updated_at_timestamp();

drop trigger if exists tile_store_widget_configs_set_updated_at on public.tile_store_widget_configs;
create trigger tile_store_widget_configs_set_updated_at
before update on public.tile_store_widget_configs
for each row execute function public.set_updated_at_timestamp();

-- ---------------------------------------------------------
-- 5. Admin helper function
-- ---------------------------------------------------------
create or replace function public.is_admin_user(actor_id uuid default auth.uid())
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.user_access ua
    where
      ua.user_id = actor_id
      and ua.platform = 'admin'
      and ua.mode = 'default'
      and ua.has_access = true
  );
$$;

-- ---------------------------------------------------------
-- 6. RLS
-- Authenticated users can read only visible apps.
-- Admins can fully manage store content.
-- ---------------------------------------------------------
alter table public.tile_store_apps enable row level security;
alter table public.tile_store_app_features enable row level security;
alter table public.tile_store_app_screenshots enable row level security;
alter table public.tile_store_app_modes enable row level security;
alter table public.tile_store_widget_configs enable row level security;

drop policy if exists "tile_store_apps_read_authenticated" on public.tile_store_apps;
create policy "tile_store_apps_read_authenticated"
on public.tile_store_apps
for select
to authenticated
using (is_globally_enabled = true or public.is_admin_user());

drop policy if exists "tile_store_apps_admin_all" on public.tile_store_apps;
create policy "tile_store_apps_admin_all"
on public.tile_store_apps
for all
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "tile_store_app_features_read_authenticated" on public.tile_store_app_features;
create policy "tile_store_app_features_read_authenticated"
on public.tile_store_app_features
for select
to authenticated
using (
  exists (
    select 1
    from public.tile_store_apps tsa
    where tsa.tile_id = tile_store_app_features.tile_id
      and (tsa.is_globally_enabled = true or public.is_admin_user())
  )
);

drop policy if exists "tile_store_app_features_admin_all" on public.tile_store_app_features;
create policy "tile_store_app_features_admin_all"
on public.tile_store_app_features
for all
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "tile_store_app_screenshots_read_authenticated" on public.tile_store_app_screenshots;
create policy "tile_store_app_screenshots_read_authenticated"
on public.tile_store_app_screenshots
for select
to authenticated
using (
  exists (
    select 1
    from public.tile_store_apps tsa
    where tsa.tile_id = tile_store_app_screenshots.tile_id
      and (tsa.is_globally_enabled = true or public.is_admin_user())
  )
);

drop policy if exists "tile_store_app_screenshots_admin_all" on public.tile_store_app_screenshots;
create policy "tile_store_app_screenshots_admin_all"
on public.tile_store_app_screenshots
for all
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "tile_store_app_modes_read_authenticated" on public.tile_store_app_modes;
create policy "tile_store_app_modes_read_authenticated"
on public.tile_store_app_modes
for select
to authenticated
using (
  is_enabled = true
  or public.is_admin_user()
);

drop policy if exists "tile_store_app_modes_admin_all" on public.tile_store_app_modes;
create policy "tile_store_app_modes_admin_all"
on public.tile_store_app_modes
for all
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "tile_store_widget_configs_read_authenticated" on public.tile_store_widget_configs;
create policy "tile_store_widget_configs_read_authenticated"
on public.tile_store_widget_configs
for select
to authenticated
using (
  exists (
    select 1
    from public.tile_store_apps tsa
    where tsa.tile_id = tile_store_widget_configs.tile_id
      and (tsa.is_globally_enabled = true or public.is_admin_user())
  )
);

drop policy if exists "tile_store_widget_configs_admin_all" on public.tile_store_widget_configs;
create policy "tile_store_widget_configs_admin_all"
on public.tile_store_widget_configs
for all
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

-- ---------------------------------------------------------
-- 7. Storage bucket for screenshot uploads
-- ---------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('tile-store-screenshots', 'tile-store-screenshots', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "tile_store_screenshots_public_read" on storage.objects;
create policy "tile_store_screenshots_public_read"
on storage.objects
for select
to authenticated
using (bucket_id = 'tile-store-screenshots');

drop policy if exists "tile_store_screenshots_admin_insert" on storage.objects;
create policy "tile_store_screenshots_admin_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'tile-store-screenshots'
  and public.is_admin_user()
);

drop policy if exists "tile_store_screenshots_admin_update" on storage.objects;
create policy "tile_store_screenshots_admin_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'tile-store-screenshots'
  and public.is_admin_user()
)
with check (
  bucket_id = 'tile-store-screenshots'
  and public.is_admin_user()
);

drop policy if exists "tile_store_screenshots_admin_delete" on storage.objects;
create policy "tile_store_screenshots_admin_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'tile-store-screenshots'
  and public.is_admin_user()
);

-- ---------------------------------------------------------
-- 8. Seed current apps
-- ---------------------------------------------------------
insert into public.tile_store_apps (
  tile_id,
  app_name,
  category,
  short_description,
  full_description,
  developer_name,
  version,
  is_globally_enabled
)
values
  (
    'announcements',
    'Announcements',
    'Church',
    'Create announcements and prepare them for church displays.',
    'Create and manage church announcements, then prepare them for shared display and service workflows.',
    'Oikos Church',
    '1.0',
    true
  ),
  (
    'sermon',
    'Sermon',
    'Church',
    'Build sermons with scripture, notes, and preacher view.',
    'Build sermons with scripture blocks, notes, custom slides, and preacher-facing live views.',
    'Oikos Church',
    '1.0',
    true
  ),
  (
    'service',
    'Service',
    'Media',
    'Manage service slides and screen-ready content.',
    'Manage the service slideshow pipeline and review items sent from sermon and future church tile apps.',
    'Oikos Church',
    '1.0',
    true
  ),
  (
    'global-users',
    'Global Users',
    'Admin',
    'Manage platform users, approvals, access, and roles.',
    'Manage users across the platform with approvals, access state, profile details, roles, and organization membership.',
    'Oikos Admin',
    '1.0',
    true
  ),
  (
    'tile-store-manager',
    'Tile Store Admin',
    'Admin',
    'Manage global tile visibility, modes, descriptions, screenshots, and widgets.',
    'Manage the full global tile store with mode assignments, screenshots, descriptions, features, and widget configuration.',
    'Oikos Admin',
    '1.0',
    true
  )
on conflict (tile_id) do update
set
  app_name = excluded.app_name,
  category = excluded.category,
  short_description = excluded.short_description,
  full_description = excluded.full_description,
  developer_name = excluded.developer_name,
  version = excluded.version,
  is_globally_enabled = excluded.is_globally_enabled,
  updated_at = timezone('utc', now());

insert into public.tile_store_app_features (tile_id, feature_text, sort_order)
values
  ('announcements', 'Create announcement content', 1),
  ('announcements', 'Prepare church display messaging', 2),
  ('announcements', 'Connects with the church tile system', 3),
  ('sermon', 'Create sermon drafts', 1),
  ('sermon', 'Add scripture and custom slides', 2),
  ('sermon', 'Open a live preacher view with notes', 3),
  ('service', 'Review service items', 1),
  ('service', 'Prepare screen content', 2),
  ('service', 'Connect sermon slides to the service flow', 3),
  ('global-users', 'View total, approved, pending, denied, and paused users', 1),
  ('global-users', 'Search and filter global user accounts', 2),
  ('global-users', 'Open detailed user management panels', 3),
  ('tile-store-manager', 'Show or hide tile apps globally', 1),
  ('tile-store-manager', 'Assign tile apps to platform modes', 2),
  ('tile-store-manager', 'Manage screenshots and widget settings', 3)
on conflict (tile_id, sort_order) do update
set
  feature_text = excluded.feature_text,
  updated_at = timezone('utc', now());

insert into public.tile_store_app_modes (tile_id, mode, is_enabled, sort_order)
values
  ('global-users', 'admin', true, 1),
  ('tile-store-manager', 'admin', true, 2),
  ('announcements', 'church', true, 1),
  ('sermon', 'church', true, 2),
  ('service', 'church', true, 3)
on conflict (tile_id, mode) do update
set
  is_enabled = excluded.is_enabled,
  sort_order = excluded.sort_order,
  updated_at = timezone('utc', now());

insert into public.tile_store_widget_configs (tile_id, primary_stat, secondary_stat)
values
  ('announcements', 'recent-updates', 'second-message'),
  ('sermon', 'draft-title', 'sermon-slides'),
  ('service', 'service-items', 'service-slides'),
  ('global-users', 'total-users', 'approved-users'),
  ('tile-store-manager', 'total-apps', 'enabled-apps')
on conflict (tile_id) do update
set
  primary_stat = excluded.primary_stat,
  secondary_stat = excluded.secondary_stat,
  updated_at = timezone('utc', now());

-- Force one sync pass into the current catalog table.
insert into public.mode_tile_catalog (mode, tile_id, is_enabled, sort_order)
select mode, tile_id, is_enabled, sort_order
from public.tile_store_app_modes
on conflict (mode, tile_id) do update
set
  is_enabled = excluded.is_enabled,
  sort_order = excluded.sort_order,
  updated_at = timezone('utc', now());

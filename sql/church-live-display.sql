create extension if not exists pgcrypto;

create table if not exists public.church_live_displays (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mode text not null default 'church',
  name text not null default 'Sunday Display',
  service_id text not null default 'current_service',
  public_code text not null unique,
  display_state text not null default 'loop',
  is_ready boolean not null default false,
  is_live boolean not null default false,
  is_active boolean not null default true,
  selected_service_item_id text not null default 'all-service-items',
  current_slide_index integer not null default 0,
  live_slides jsonb not null default '[]'::jsonb,
  organization_name text not null default '',
  organization_logo_url text not null default '',
  loop_interval_seconds integer not null default 6,
  pre_service_items jsonb not null default '[]'::jsonb,
  approved_at timestamptz,
  started_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.church_live_displays
  add column if not exists selected_service_item_id text not null default 'all-service-items';

alter table public.church_live_displays
  add column if not exists current_slide_index integer not null default 0;

alter table public.church_live_displays
  add column if not exists live_slides jsonb not null default '[]'::jsonb;

alter table public.church_live_displays
  add column if not exists organization_name text not null default '';

alter table public.church_live_displays
  add column if not exists organization_logo_url text not null default '';

alter table public.church_live_displays
  add column if not exists loop_interval_seconds integer not null default 6;

create unique index if not exists church_live_displays_user_mode_active_idx
on public.church_live_displays (user_id, mode, is_active)
where is_active = true;

create table if not exists public.church_live_screens (
  id uuid primary key default gen_random_uuid(),
  display_id uuid not null references public.church_live_displays (id) on delete cascade,
  screen_code text not null unique,
  screen_name text not null default 'Live screen',
  status text not null default 'connected',
  device_info text not null default '',
  last_seen_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists church_live_screens_display_idx
on public.church_live_screens (display_id, last_seen_at desc);

create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists church_live_displays_set_updated_at on public.church_live_displays;
create trigger church_live_displays_set_updated_at
before update on public.church_live_displays
for each row execute function public.set_updated_at_timestamp();

alter table public.church_live_displays enable row level security;
alter table public.church_live_screens enable row level security;

drop policy if exists "church_live_displays_select_own_or_public" on public.church_live_displays;
create policy "church_live_displays_select_own_or_public"
on public.church_live_displays
for select
to authenticated, anon
using (
  auth.uid() = user_id
  or (is_active = true and is_ready = true)
);

drop policy if exists "church_live_displays_insert_own" on public.church_live_displays;
create policy "church_live_displays_insert_own"
on public.church_live_displays
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "church_live_displays_update_own" on public.church_live_displays;
create policy "church_live_displays_update_own"
on public.church_live_displays
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "church_live_displays_delete_own" on public.church_live_displays;
create policy "church_live_displays_delete_own"
on public.church_live_displays
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "church_live_screens_select_owner_or_public_display" on public.church_live_screens;
create policy "church_live_screens_select_owner_or_public_display"
on public.church_live_screens
for select
to authenticated, anon
using (
  exists (
    select 1
    from public.church_live_displays d
    where d.id = church_live_screens.display_id
      and (
        d.user_id = auth.uid()
        or (d.is_active = true and d.is_ready = true)
      )
  )
);

drop policy if exists "church_live_screens_insert_connected" on public.church_live_screens;
create policy "church_live_screens_insert_connected"
on public.church_live_screens
for insert
to authenticated, anon
with check (
  exists (
    select 1
    from public.church_live_displays d
    where d.id = church_live_screens.display_id
      and d.is_active = true
      and d.is_ready = true
  )
);

drop policy if exists "church_live_screens_update_owner" on public.church_live_screens;
create policy "church_live_screens_update_owner"
on public.church_live_screens
for update
to authenticated
using (
  exists (
    select 1
    from public.church_live_displays d
    where d.id = church_live_screens.display_id
      and d.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.church_live_displays d
    where d.id = church_live_screens.display_id
      and d.user_id = auth.uid()
  )
);

drop policy if exists "church_live_screens_update_public_display" on public.church_live_screens;
create policy "church_live_screens_update_public_display"
on public.church_live_screens
for update
to authenticated, anon
using (
  exists (
    select 1
    from public.church_live_displays d
    where d.id = church_live_screens.display_id
      and d.is_active = true
      and d.is_ready = true
  )
)
with check (
  exists (
    select 1
    from public.church_live_displays d
    where d.id = church_live_screens.display_id
      and d.is_active = true
      and d.is_ready = true
  )
);

drop policy if exists "church_live_screens_delete_owner" on public.church_live_screens;
create policy "church_live_screens_delete_owner"
on public.church_live_screens
for delete
to authenticated
using (
  exists (
    select 1
    from public.church_live_displays d
    where d.id = church_live_screens.display_id
      and d.user_id = auth.uid()
  )
);

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
    'live-display',
    'Live Display',
    'Media',
    'Run the pre-service loop and take over every connected screen when service starts.',
    'Live Display keeps announcements and event cards looping before service, then switches every connected screen into your active service slideshow with one click.',
    'Oikos Church',
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
    'remote',
    'Remote',
    'Media',
    'Control the live service slideshow from another device.',
    'Remote gives you back, next, and direct slide selection for the church live service slideshow from another logged-in device.',
    'Oikos Church',
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
  ('live-display', 'Loop announcements and events before service starts', 1),
  ('live-display', 'Start service takeover on all connected screens', 2),
  ('live-display', 'Generate a live link so any screen can connect', 3),
  ('remote', 'Move forward and backward through live slides', 1),
  ('remote', 'Jump directly to a selected live slide', 2),
  ('remote', 'Control the live display from another device', 3)
on conflict (tile_id, sort_order) do update
set
  feature_text = excluded.feature_text,
  updated_at = timezone('utc', now());

insert into public.tile_store_app_modes (tile_id, mode, is_enabled, sort_order)
values
  ('live-display', 'church', true, 4),
  ('remote', 'church', true, 5)
on conflict (tile_id, mode) do update
set
  is_enabled = excluded.is_enabled,
  sort_order = excluded.sort_order,
  updated_at = timezone('utc', now());

insert into public.mode_tile_catalog (mode, tile_id, is_enabled, sort_order)
values
  ('church', 'live-display', true, 4),
  ('church', 'remote', true, 5)
on conflict (mode, tile_id) do update
set
  is_enabled = excluded.is_enabled,
  sort_order = excluded.sort_order,
  updated_at = timezone('utc', now());

insert into public.tile_store_widget_configs (tile_id, primary_stat, secondary_stat)
values
  ('live-display', 'display-state', 'screen-count')
on conflict (tile_id) do update
set
  primary_stat = excluded.primary_stat,
  secondary_stat = excluded.secondary_stat,
  updated_at = timezone('utc', now());

-- Optional one-time cleanup if old refresh logic created inflated screen rows.
-- Uncomment and run once if you want to clear old device counts completely.
-- delete from public.church_live_screens;

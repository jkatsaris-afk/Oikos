create extension if not exists pgcrypto;

create table if not exists public.church_hymns (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.accounts (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  is_global boolean not null default true,
  song_number text not null default '',
  title text not null default '',
  title_source text not null default 'unknown',
  source_file_name text not null default '',
  source_relative_path text not null default '',
  source_extension text not null default '',
  file_path text not null default '',
  file_url text not null default '',
  slide_count integer not null default 0,
  slides jsonb not null default '[]'::jsonb,
  needs_review boolean not null default true,
  license_verified boolean not null default false,
  license_proof_url text not null default '',
  license_proof_path text not null default '',
  is_admin_approved boolean not null default false,
  approved_by uuid references auth.users (id) on delete set null,
  approved_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique nulls not distinct (account_id, song_number, source_file_name)
);

alter table public.church_hymns
  alter column account_id drop not null;

alter table public.church_hymns
  add column if not exists is_global boolean not null default true;

alter table public.church_hymns
  add column if not exists file_path text not null default '';

alter table public.church_hymns
  add column if not exists file_url text not null default '';

alter table public.church_hymns
  add column if not exists is_admin_approved boolean not null default false;

alter table public.church_hymns
  add column if not exists approved_by uuid references auth.users (id) on delete set null;

alter table public.church_hymns
  add column if not exists approved_at timestamptz;

create index if not exists church_hymns_account_song_idx
on public.church_hymns (account_id, song_number, is_active);

create index if not exists church_hymns_account_title_idx
on public.church_hymns (account_id, title, is_active);

create index if not exists church_hymns_account_approved_idx
on public.church_hymns (account_id, is_admin_approved, is_active);

create index if not exists church_hymns_global_song_idx
on public.church_hymns (is_global, song_number, is_active);

create index if not exists church_hymns_global_title_idx
on public.church_hymns (is_global, title, is_active);

create index if not exists church_hymns_global_approved_idx
on public.church_hymns (is_global, is_admin_approved, is_active);

create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists church_hymns_set_updated_at on public.church_hymns;
create trigger church_hymns_set_updated_at
before update on public.church_hymns
for each row execute function public.set_updated_at_timestamp();

create or replace function public.can_access_account_member(account_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.accounts a
    where a.id = account_uuid
      and (
        a.owner_user_id = auth.uid()
        or exists (
          select 1
          from public.account_members am
          where am.account_id = a.id
            and am.user_id = auth.uid()
        )
      )
  );
$$;

grant execute on function public.can_access_account_member(uuid) to authenticated;

create or replace function public.can_manage_church_hymn_asset(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_access_account_member(
    nullif(split_part(object_name, '/', 1), '')::uuid
  );
$$;

grant execute on function public.can_manage_church_hymn_asset(text) to authenticated;

create or replace function public.can_manage_global_hymn_asset()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin_user();
$$;

grant execute on function public.can_manage_global_hymn_asset() to authenticated;

insert into storage.buckets (id, name, public)
values ('church-hymn-files', 'church-hymn-files', false)
on conflict (id) do update
set public = excluded.public;

insert into storage.buckets (id, name, public)
values ('church-hymn-proofs', 'church-hymn-proofs', false)
on conflict (id) do update
set public = excluded.public;

insert into storage.buckets (id, name, public)
values ('global-hymn-files', 'global-hymn-files', false)
on conflict (id) do update
set public = excluded.public;

insert into storage.buckets (id, name, public)
values ('global-hymn-proofs', 'global-hymn-proofs', false)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "church_hymn_files_member_read" on storage.objects;
create policy "church_hymn_files_member_read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'church-hymn-files'
  and public.can_manage_church_hymn_asset(name)
);

drop policy if exists "church_hymn_files_member_insert" on storage.objects;
create policy "church_hymn_files_member_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'church-hymn-files'
  and public.can_manage_church_hymn_asset(name)
);

drop policy if exists "church_hymn_files_member_update" on storage.objects;
create policy "church_hymn_files_member_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'church-hymn-files'
  and public.can_manage_church_hymn_asset(name)
)
with check (
  bucket_id = 'church-hymn-files'
  and public.can_manage_church_hymn_asset(name)
);

drop policy if exists "church_hymn_files_member_delete" on storage.objects;
create policy "church_hymn_files_member_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'church-hymn-files'
  and public.can_manage_church_hymn_asset(name)
);

drop policy if exists "church_hymn_proofs_member_read" on storage.objects;
create policy "church_hymn_proofs_member_read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'church-hymn-proofs'
  and public.can_manage_church_hymn_asset(name)
);

drop policy if exists "church_hymn_proofs_member_insert" on storage.objects;
create policy "church_hymn_proofs_member_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'church-hymn-proofs'
  and public.can_manage_church_hymn_asset(name)
);

drop policy if exists "church_hymn_proofs_member_update" on storage.objects;
create policy "church_hymn_proofs_member_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'church-hymn-proofs'
  and public.can_manage_church_hymn_asset(name)
)
with check (
  bucket_id = 'church-hymn-proofs'
  and public.can_manage_church_hymn_asset(name)
);

drop policy if exists "church_hymn_proofs_member_delete" on storage.objects;
create policy "church_hymn_proofs_member_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'church-hymn-proofs'
  and public.can_manage_church_hymn_asset(name)
);

drop policy if exists "global_hymn_files_read_authenticated" on storage.objects;
create policy "global_hymn_files_read_authenticated"
on storage.objects
for select
to authenticated
using (bucket_id = 'global-hymn-files');

drop policy if exists "global_hymn_files_admin_insert" on storage.objects;
create policy "global_hymn_files_admin_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'global-hymn-files'
  and public.can_manage_global_hymn_asset()
);

drop policy if exists "global_hymn_files_admin_update" on storage.objects;
create policy "global_hymn_files_admin_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'global-hymn-files'
  and public.can_manage_global_hymn_asset()
)
with check (
  bucket_id = 'global-hymn-files'
  and public.can_manage_global_hymn_asset()
);

drop policy if exists "global_hymn_files_admin_delete" on storage.objects;
create policy "global_hymn_files_admin_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'global-hymn-files'
  and public.can_manage_global_hymn_asset()
);

drop policy if exists "global_hymn_proofs_admin_read" on storage.objects;
create policy "global_hymn_proofs_admin_read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'global-hymn-proofs'
  and public.can_manage_global_hymn_asset()
);

drop policy if exists "global_hymn_proofs_admin_insert" on storage.objects;
create policy "global_hymn_proofs_admin_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'global-hymn-proofs'
  and public.can_manage_global_hymn_asset()
);

drop policy if exists "global_hymn_proofs_admin_update" on storage.objects;
create policy "global_hymn_proofs_admin_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'global-hymn-proofs'
  and public.can_manage_global_hymn_asset()
)
with check (
  bucket_id = 'global-hymn-proofs'
  and public.can_manage_global_hymn_asset()
);

drop policy if exists "global_hymn_proofs_admin_delete" on storage.objects;
create policy "global_hymn_proofs_admin_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'global-hymn-proofs'
  and public.can_manage_global_hymn_asset()
);

alter table public.church_hymns enable row level security;

drop policy if exists "church_hymns_select_global_or_org_members" on public.church_hymns;
create policy "church_hymns_select_global_or_org_members"
on public.church_hymns
for select
to authenticated
using (
  church_hymns.is_global = true
  or (
    church_hymns.account_id is not null
    and public.can_access_account_member(church_hymns.account_id)
  )
);

drop policy if exists "church_hymns_insert_global_or_org_members" on public.church_hymns;
create policy "church_hymns_insert_global_or_org_members"
on public.church_hymns
for insert
to authenticated
with check (
  (church_hymns.is_global = true and public.is_admin_user())
  or (
    church_hymns.is_global = false
    and church_hymns.account_id is not null
    and public.can_access_account_member(church_hymns.account_id)
  )
);

drop policy if exists "church_hymns_update_global_or_org_members" on public.church_hymns;
create policy "church_hymns_update_global_or_org_members"
on public.church_hymns
for update
to authenticated
using (
  (church_hymns.is_global = true and public.is_admin_user())
  or (
    church_hymns.is_global = false
    and church_hymns.account_id is not null
    and public.can_access_account_member(church_hymns.account_id)
  )
)
with check (
  (church_hymns.is_global = true and public.is_admin_user())
  or (
    church_hymns.is_global = false
    and church_hymns.account_id is not null
    and public.can_access_account_member(church_hymns.account_id)
  )
);

drop policy if exists "church_hymns_delete_global_or_org_members" on public.church_hymns;
create policy "church_hymns_delete_global_or_org_members"
on public.church_hymns
for delete
to authenticated
using (
  (church_hymns.is_global = true and public.is_admin_user())
  or (
    church_hymns.is_global = false
    and church_hymns.account_id is not null
    and public.can_access_account_member(church_hymns.account_id)
  )
);

create or replace function public.admin_set_hymn_tile_access(target_user_id uuid, enabled boolean)
returns public.user_access
language plpgsql
security definer
set search_path = public
as $$
declare
  result_row public.user_access;
begin
  if not public.is_admin_user() then
    raise exception 'Only admin users can manage Hymns tile access.';
  end if;

  update public.user_access
  set has_access = enabled
  where
    user_id = target_user_id
    and platform = 'church'
    and mode = 'hymns';

  if not found then
    insert into public.user_access (
      user_id,
      platform,
      mode,
      has_access
    )
    values (
      target_user_id,
      'church',
      'hymns',
      enabled
    );
  end if;

  select *
  into result_row
  from public.user_access
  where
    user_id = target_user_id
    and platform = 'church'
    and mode = 'hymns'
  order by has_access desc
  limit 1;

  return result_row;
end;
$$;

grant execute on function public.admin_set_hymn_tile_access(uuid, boolean) to authenticated;

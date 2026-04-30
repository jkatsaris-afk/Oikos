create extension if not exists pgcrypto;

alter table public.accounts
  add column if not exists logo_url text not null default '';

alter table public.accounts
  add column if not exists logo_path text not null default '';

alter table public.accounts
  add column if not exists brand_color text not null default '';

alter table public.accounts
  add column if not exists address_line_1 text not null default '';

alter table public.accounts
  add column if not exists address_line_2 text not null default '';

alter table public.accounts
  add column if not exists city text not null default '';

alter table public.accounts
  add column if not exists state_region text not null default '';

alter table public.accounts
  add column if not exists postal_code text not null default '';

alter table public.accounts
  add column if not exists country text not null default '';

alter table public.accounts
  add column if not exists integrations jsonb not null default '{}'::jsonb;

insert into storage.buckets (id, name, public)
values ('organization-assets', 'organization-assets', true)
on conflict (id) do update
set public = excluded.public;

create or replace function public.can_manage_organization_asset(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.accounts a
    left join public.account_members am
      on am.account_id = a.id
      and am.user_id = auth.uid()
    where a.id::text = split_part(object_name, '/', 1)
      and (
        a.owner_user_id = auth.uid()
        or (am.role = 'owner' and coalesce(am.status, 'pending') = 'active')
      )
  );
$$;

grant execute on function public.can_manage_organization_asset(text) to authenticated;

create or replace function public.organization_activate_member(
  account_uuid uuid,
  target_user_id uuid
)
returns table (
  account_id uuid,
  user_id uuid,
  role text,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  account_type text;
begin
  if not exists (
    select 1
    from public.accounts a
    left join public.account_members am
      on am.account_id = a.id
      and am.user_id = auth.uid()
    where a.id = account_uuid
      and (
        a.owner_user_id = auth.uid()
        or (am.role = 'owner' and coalesce(am.status, 'pending') = 'active')
      )
  ) then
    raise exception 'Only organization owners can activate members.';
  end if;

  update public.account_members
  set status = 'active'
  where account_id = account_uuid
    and user_id = target_user_id;

  if not found then
    raise exception 'The selected user is not a member of this organization.';
  end if;

  update public.profiles
  set
    is_approved = true,
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('approval_status', 'approved')
  where id = target_user_id;

  select a.type
  into account_type
  from public.accounts a
  where a.id = account_uuid
  limit 1;

  if account_type in ('campus', 'church', 'sports', 'pages', 'farm', 'admin') then
    update public.user_access
    set has_access = true
    where
      user_id = target_user_id
      and platform = account_type
      and mode = 'default';

    if not found then
      insert into public.user_access (
        user_id,
        platform,
        mode,
        has_access
      )
      values (
        target_user_id,
        account_type,
        'default',
        true
      );
    end if;
  end if;

  return query
  select
    am.account_id,
    am.user_id,
    am.role,
    am.status
  from public.account_members am
  where am.account_id = account_uuid
    and am.user_id = target_user_id
  limit 1;
end;
$$;

grant execute on function public.organization_activate_member(uuid, uuid) to authenticated;

drop policy if exists "organization_assets_public_read" on storage.objects;
create policy "organization_assets_public_read"
on storage.objects
for select
to authenticated, anon
using (bucket_id = 'organization-assets');

drop policy if exists "organization_assets_owner_insert" on storage.objects;
create policy "organization_assets_owner_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'organization-assets'
  and public.can_manage_organization_asset(name)
);

drop policy if exists "organization_assets_owner_update" on storage.objects;
create policy "organization_assets_owner_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'organization-assets'
  and public.can_manage_organization_asset(name)
)
with check (
  bucket_id = 'organization-assets'
  and public.can_manage_organization_asset(name)
);

drop policy if exists "organization_assets_owner_delete" on storage.objects;
create policy "organization_assets_owner_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'organization-assets'
  and public.can_manage_organization_asset(name)
);

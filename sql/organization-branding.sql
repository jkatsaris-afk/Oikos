create extension if not exists pgcrypto;

alter table public.accounts
  add column if not exists logo_url text not null default '';

alter table public.accounts
  add column if not exists logo_path text not null default '';

insert into storage.buckets (id, name, public)
values ('organization-assets', 'organization-assets', true)
on conflict (id) do update
set public = excluded.public;

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
  and exists (
    select 1
    from public.accounts a
    where a.id::text = (storage.foldername(name))[1]
      and a.owner_user_id = auth.uid()
  )
);

drop policy if exists "organization_assets_owner_update" on storage.objects;
create policy "organization_assets_owner_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'organization-assets'
  and exists (
    select 1
    from public.accounts a
    where a.id::text = (storage.foldername(name))[1]
      and a.owner_user_id = auth.uid()
  )
)
with check (
  bucket_id = 'organization-assets'
  and exists (
    select 1
    from public.accounts a
    where a.id::text = (storage.foldername(name))[1]
      and a.owner_user_id = auth.uid()
  )
);

drop policy if exists "organization_assets_owner_delete" on storage.objects;
create policy "organization_assets_owner_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'organization-assets'
  and exists (
    select 1
    from public.accounts a
    where a.id::text = (storage.foldername(name))[1]
      and a.owner_user_id = auth.uid()
  )
);

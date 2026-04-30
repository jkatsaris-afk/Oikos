create extension if not exists pgcrypto;

create table if not exists public.campus_staff (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  linked_user_id uuid references auth.users (id) on delete set null,
  staff_number text not null default '',
  first_name text not null default '',
  last_name text not null default '',
  display_name text not null default '',
  email text not null default '',
  phone text not null default '',
  alternate_phone text not null default '',
  staff_type text not null default 'Teacher',
  job_title text not null default '',
  employment_status text not null default 'Active',
  hire_date date,
  start_date date,
  end_date date,
  biography text not null default '',
  photo_path text not null default '',
  photo_url text not null default '',
  grade_assignments jsonb not null default '[]'::jsonb,
  student_assignments jsonb not null default '[]'::jsonb,
  classroom_assignments jsonb not null default '[]'::jsonb,
  subject_assignments jsonb not null default '[]'::jsonb,
  program_assignments jsonb not null default '[]'::jsonb,
  tags jsonb not null default '[]'::jsonb,
  account_notes text not null default '',
  notes text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique nulls not distinct (account_id, email),
  unique nulls not distinct (account_id, staff_number)
);

create index if not exists campus_staff_account_name_idx
on public.campus_staff (account_id, last_name, first_name, is_active);

create index if not exists campus_staff_account_type_idx
on public.campus_staff (account_id, staff_type, employment_status, is_active);

create index if not exists campus_staff_account_linked_user_idx
on public.campus_staff (account_id, linked_user_id, is_active);

alter table public.campus_staff
  add column if not exists student_assignments jsonb not null default '[]'::jsonb;

create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists campus_staff_set_updated_at on public.campus_staff;
create trigger campus_staff_set_updated_at
before update on public.campus_staff
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

create or replace function public.campus_set_teacher_portal_access(
  account_uuid uuid,
  target_user_id uuid,
  enabled boolean
)
returns public.user_access
language plpgsql
security definer
set search_path = public
as $$
declare
  result_row public.user_access;
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
    raise exception 'Only campus organization owners can manage teacher portal access.';
  end if;

  if not exists (
    select 1
    from public.account_members am_target
    where am_target.account_id = account_uuid
      and am_target.user_id = target_user_id
  ) then
    raise exception 'The selected user is not a member of this campus organization.';
  end if;

  update public.user_access
  set has_access = enabled
  where
    user_id = target_user_id
    and platform = 'campus'
    and mode = 'teacher_portal';

  if not found then
    insert into public.user_access (
      user_id,
      platform,
      mode,
      has_access
    )
    values (
      target_user_id,
      'campus',
      'teacher_portal',
      enabled
    );
  end if;

  select *
  into result_row
  from public.user_access
  where
    user_id = target_user_id
    and platform = 'campus'
    and mode = 'teacher_portal'
  order by has_access desc
  limit 1;

  return result_row;
end;
$$;

grant execute on function public.campus_set_teacher_portal_access(uuid, uuid, boolean) to authenticated;

create or replace function public.can_manage_campus_staff_photo(object_name text)
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

grant execute on function public.can_manage_campus_staff_photo(text) to authenticated;

insert into storage.buckets (id, name, public)
values ('campus-staff-photos', 'campus-staff-photos', false)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "campus_staff_photos_member_read" on storage.objects;
create policy "campus_staff_photos_member_read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'campus-staff-photos'
  and public.can_manage_campus_staff_photo(name)
);

drop policy if exists "campus_staff_photos_member_insert" on storage.objects;
create policy "campus_staff_photos_member_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'campus-staff-photos'
  and public.can_manage_campus_staff_photo(name)
);

drop policy if exists "campus_staff_photos_member_update" on storage.objects;
create policy "campus_staff_photos_member_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'campus-staff-photos'
  and public.can_manage_campus_staff_photo(name)
)
with check (
  bucket_id = 'campus-staff-photos'
  and public.can_manage_campus_staff_photo(name)
);

drop policy if exists "campus_staff_photos_member_delete" on storage.objects;
create policy "campus_staff_photos_member_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'campus-staff-photos'
  and public.can_manage_campus_staff_photo(name)
);

alter table public.campus_staff enable row level security;

drop policy if exists "campus_staff_members_select" on public.campus_staff;
create policy "campus_staff_members_select"
on public.campus_staff
for select
to authenticated
using (
  public.can_access_account_member(campus_staff.account_id)
);

drop policy if exists "campus_staff_members_insert" on public.campus_staff;
create policy "campus_staff_members_insert"
on public.campus_staff
for insert
to authenticated
with check (
  public.can_access_account_member(campus_staff.account_id)
);

drop policy if exists "campus_staff_members_update" on public.campus_staff;
create policy "campus_staff_members_update"
on public.campus_staff
for update
to authenticated
using (
  public.can_access_account_member(campus_staff.account_id)
)
with check (
  public.can_access_account_member(campus_staff.account_id)
);

drop policy if exists "campus_staff_members_delete" on public.campus_staff;
create policy "campus_staff_members_delete"
on public.campus_staff
for delete
to authenticated
using (
  public.can_access_account_member(campus_staff.account_id)
);

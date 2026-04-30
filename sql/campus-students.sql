create extension if not exists pgcrypto;

create table if not exists public.campus_students (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  student_number text not null default '',
  state_id text not null default '',
  local_id text not null default '',
  campus_person_id text not null default '',
  legal_first_name text not null default '',
  legal_middle_name text not null default '',
  legal_last_name text not null default '',
  legal_suffix text not null default '',
  preferred_first_name text not null default '',
  preferred_last_name text not null default '',
  display_name text not null default '',
  date_of_birth date,
  gender text not null default '',
  sex text not null default '',
  grade_level text not null default '',
  school_name text not null default '',
  campus_name text not null default '',
  homeroom_teacher text not null default '',
  counselor_name text not null default '',
  enrollment_status text not null default 'Active',
  current_enrollment_status text not null default 'Currently Enrolled',
  enrollment_start_date date,
  enrollment_end_date date,
  graduation_year integer,
  tuition_payment_status text not null default '',
  tuition_balance_cents integer not null default 0,
  primary_language text not null default '',
  home_language text not null default '',
  ethnicity text not null default '',
  race_ethnicity jsonb not null default '[]'::jsonb,
  photo_path text not null default '',
  photo_url text not null default '',
  household_name text not null default '',
  primary_phone text not null default '',
  primary_email text not null default '',
  street_address_1 text not null default '',
  street_address_2 text not null default '',
  city text not null default '',
  state text not null default '',
  postal_code text not null default '',
  demographics jsonb not null default '{}'::jsonb,
  guardians jsonb not null default '[]'::jsonb,
  emergency_contacts jsonb not null default '[]'::jsonb,
  medical jsonb not null default '{}'::jsonb,
  disciplinary jsonb not null default '[]'::jsonb,
  parent_contact_log jsonb not null default '[]'::jsonb,
  enrollment jsonb not null default '{}'::jsonb,
  program_participation jsonb not null default '{}'::jsonb,
  tags jsonb not null default '[]'::jsonb,
  custom_fields jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique nulls not distinct (account_id, student_number),
  unique nulls not distinct (account_id, state_id)
);

alter table public.campus_students
  drop column if exists pronouns;

create index if not exists campus_students_account_grade_idx
on public.campus_students (account_id, grade_level, is_active);

create index if not exists campus_students_account_name_idx
on public.campus_students (account_id, legal_last_name, legal_first_name, is_active);

create index if not exists campus_students_account_status_idx
on public.campus_students (account_id, enrollment_status, is_active);

create index if not exists campus_students_account_school_idx
on public.campus_students (account_id, school_name, is_active);

create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists campus_students_set_updated_at on public.campus_students;
create trigger campus_students_set_updated_at
before update on public.campus_students
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

create or replace function public.can_manage_campus_student_photo(object_name text)
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

grant execute on function public.can_manage_campus_student_photo(text) to authenticated;

insert into storage.buckets (id, name, public)
values ('campus-student-photos', 'campus-student-photos', false)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "campus_student_photos_member_read" on storage.objects;
create policy "campus_student_photos_member_read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'campus-student-photos'
  and public.can_manage_campus_student_photo(name)
);

drop policy if exists "campus_student_photos_member_insert" on storage.objects;
create policy "campus_student_photos_member_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'campus-student-photos'
  and public.can_manage_campus_student_photo(name)
);

drop policy if exists "campus_student_photos_member_update" on storage.objects;
create policy "campus_student_photos_member_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'campus-student-photos'
  and public.can_manage_campus_student_photo(name)
)
with check (
  bucket_id = 'campus-student-photos'
  and public.can_manage_campus_student_photo(name)
);

drop policy if exists "campus_student_photos_member_delete" on storage.objects;
create policy "campus_student_photos_member_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'campus-student-photos'
  and public.can_manage_campus_student_photo(name)
);

alter table public.campus_students enable row level security;

drop policy if exists "campus_students_members_select" on public.campus_students;
create policy "campus_students_members_select"
on public.campus_students
for select
to authenticated
using (
  public.can_access_account_member(campus_students.account_id)
);

drop policy if exists "campus_students_members_insert" on public.campus_students;
create policy "campus_students_members_insert"
on public.campus_students
for insert
to authenticated
with check (
  public.can_access_account_member(campus_students.account_id)
);

drop policy if exists "campus_students_members_update" on public.campus_students;
create policy "campus_students_members_update"
on public.campus_students
for update
to authenticated
using (
  public.can_access_account_member(campus_students.account_id)
)
with check (
  public.can_access_account_member(campus_students.account_id)
);

drop policy if exists "campus_students_members_delete" on public.campus_students;
create policy "campus_students_members_delete"
on public.campus_students
for delete
to authenticated
using (
  public.can_access_account_member(campus_students.account_id)
);

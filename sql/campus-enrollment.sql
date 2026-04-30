create extension if not exists pgcrypto;

create table if not exists public.campus_enrollment_settings (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null unique references public.accounts (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  is_active boolean not null default true,
  is_manual_open boolean not null default false,
  auto_schedule_enabled boolean not null default false,
  auto_open_at timestamptz,
  auto_close_at timestamptz,
  public_code text not null unique default '',
  school_name_override text not null default '',
  accent_color text not null default '#134e4a',
  form_title text not null default 'Enrollment Application',
  form_intro text not null default '',
  success_message text not null default 'Your enrollment form has been received.',
  confirmation_email text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.campus_enrollment_submissions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  settings_id uuid references public.campus_enrollment_settings (id) on delete set null,
  public_code text not null default '',
  status text not null default 'new',
  student_first_name text not null default '',
  student_last_name text not null default '',
  preferred_name text not null default '',
  date_of_birth date,
  grade_applying_for text not null default '',
  school_year text not null default '',
  current_school text not null default '',
  guardian_name text not null default '',
  guardian_email text not null default '',
  guardian_phone text not null default '',
  submitted_at timestamptz not null default timezone('utc', now()),
  submission_data jsonb not null default '{}'::jsonb,
  internal_notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists campus_enrollment_settings_account_idx
on public.campus_enrollment_settings (account_id, is_active);

create index if not exists campus_enrollment_settings_public_code_idx
on public.campus_enrollment_settings (public_code, is_active);

create index if not exists campus_enrollment_submissions_account_status_idx
on public.campus_enrollment_submissions (account_id, status, submitted_at desc);

create index if not exists campus_enrollment_submissions_public_code_idx
on public.campus_enrollment_submissions (public_code, submitted_at desc);

create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists campus_enrollment_settings_set_updated_at on public.campus_enrollment_settings;
create trigger campus_enrollment_settings_set_updated_at
before update on public.campus_enrollment_settings
for each row execute function public.set_updated_at_timestamp();

drop trigger if exists campus_enrollment_submissions_set_updated_at on public.campus_enrollment_submissions;
create trigger campus_enrollment_submissions_set_updated_at
before update on public.campus_enrollment_submissions
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

grant execute on function public.can_access_account_member(uuid) to authenticated, anon;

create or replace function public.is_campus_enrollment_open(settings_row public.campus_enrollment_settings)
returns boolean
language sql
stable
set search_path = public
as $$
  select
    coalesce(settings_row.is_active, false)
    and (
      coalesce(settings_row.is_manual_open, false)
      or (
        coalesce(settings_row.auto_schedule_enabled, false)
        and settings_row.auto_open_at is not null
        and settings_row.auto_close_at is not null
        and timezone('utc', now()) >= settings_row.auto_open_at
        and timezone('utc', now()) <= settings_row.auto_close_at
      )
    );
$$;

grant execute on function public.is_campus_enrollment_open(public.campus_enrollment_settings) to authenticated, anon;

create or replace function public.get_campus_enrollment_public_view(target_code text)
returns table (
  settings_id uuid,
  account_id uuid,
  public_code text,
  school_name text,
  school_logo_url text,
  accent_color text,
  form_title text,
  form_intro text,
  success_message text,
  is_open boolean,
  auto_open_at timestamptz,
  auto_close_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.id as settings_id,
    s.account_id,
    s.public_code,
    coalesce(nullif(s.school_name_override, ''), a.name, 'Campus Enrollment') as school_name,
    coalesce(a.logo_url, '') as school_logo_url,
    coalesce(nullif(s.accent_color, ''), '#134e4a') as accent_color,
    coalesce(nullif(s.form_title, ''), 'Enrollment Application') as form_title,
    s.form_intro,
    coalesce(nullif(s.success_message, ''), 'Your enrollment form has been received.') as success_message,
    public.is_campus_enrollment_open(s) as is_open,
    s.auto_open_at,
    s.auto_close_at
  from public.campus_enrollment_settings s
  join public.accounts a
    on a.id = s.account_id
  where s.public_code = target_code
    and s.is_active = true
  limit 1;
$$;

grant execute on function public.get_campus_enrollment_public_view(text) to authenticated, anon;

create or replace function public.submit_campus_enrollment(target_code text, submission jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  settings_row public.campus_enrollment_settings;
  created_submission_id uuid;
begin
  select *
  into settings_row
  from public.campus_enrollment_settings
  where public_code = target_code
    and is_active = true
  limit 1;

  if settings_row.id is null then
    raise exception 'Enrollment form was not found.';
  end if;

  if not public.is_campus_enrollment_open(settings_row) then
    raise exception 'Enrollment is currently closed.';
  end if;

  insert into public.campus_enrollment_submissions (
    account_id,
    settings_id,
    public_code,
    status,
    student_first_name,
    student_last_name,
    preferred_name,
    date_of_birth,
    grade_applying_for,
    school_year,
    current_school,
    guardian_name,
    guardian_email,
    guardian_phone,
    submission_data
  )
  values (
    settings_row.account_id,
    settings_row.id,
    target_code,
    'new',
    coalesce(submission ->> 'studentFirstName', ''),
    coalesce(submission ->> 'studentLastName', ''),
    coalesce(submission ->> 'preferredName', ''),
    nullif(submission ->> 'dateOfBirth', '')::date,
    coalesce(submission ->> 'gradeApplyingFor', ''),
    coalesce(submission ->> 'schoolYear', ''),
    coalesce(submission ->> 'currentSchool', ''),
    coalesce(submission ->> 'guardianName', ''),
    coalesce(submission ->> 'guardianEmail', ''),
    coalesce(submission ->> 'guardianPhone', ''),
    coalesce(submission, '{}'::jsonb)
  )
  returning id into created_submission_id;

  return created_submission_id;
end;
$$;

grant execute on function public.submit_campus_enrollment(text, jsonb) to authenticated, anon;

alter table public.campus_enrollment_settings enable row level security;
alter table public.campus_enrollment_submissions enable row level security;

drop policy if exists "campus_enrollment_settings_members_select" on public.campus_enrollment_settings;
create policy "campus_enrollment_settings_members_select"
on public.campus_enrollment_settings
for select
to authenticated
using (
  public.can_access_account_member(campus_enrollment_settings.account_id)
);

drop policy if exists "campus_enrollment_settings_members_insert" on public.campus_enrollment_settings;
create policy "campus_enrollment_settings_members_insert"
on public.campus_enrollment_settings
for insert
to authenticated
with check (
  public.can_access_account_member(campus_enrollment_settings.account_id)
);

drop policy if exists "campus_enrollment_settings_members_update" on public.campus_enrollment_settings;
create policy "campus_enrollment_settings_members_update"
on public.campus_enrollment_settings
for update
to authenticated
using (
  public.can_access_account_member(campus_enrollment_settings.account_id)
)
with check (
  public.can_access_account_member(campus_enrollment_settings.account_id)
);

drop policy if exists "campus_enrollment_settings_members_delete" on public.campus_enrollment_settings;
create policy "campus_enrollment_settings_members_delete"
on public.campus_enrollment_settings
for delete
to authenticated
using (
  public.can_access_account_member(campus_enrollment_settings.account_id)
);

drop policy if exists "campus_enrollment_submissions_members_select" on public.campus_enrollment_submissions;
create policy "campus_enrollment_submissions_members_select"
on public.campus_enrollment_submissions
for select
to authenticated
using (
  public.can_access_account_member(campus_enrollment_submissions.account_id)
);

drop policy if exists "campus_enrollment_submissions_members_insert" on public.campus_enrollment_submissions;
create policy "campus_enrollment_submissions_members_insert"
on public.campus_enrollment_submissions
for insert
to authenticated
with check (
  public.can_access_account_member(campus_enrollment_submissions.account_id)
);

drop policy if exists "campus_enrollment_submissions_members_update" on public.campus_enrollment_submissions;
create policy "campus_enrollment_submissions_members_update"
on public.campus_enrollment_submissions
for update
to authenticated
using (
  public.can_access_account_member(campus_enrollment_submissions.account_id)
)
with check (
  public.can_access_account_member(campus_enrollment_submissions.account_id)
);

drop policy if exists "campus_enrollment_submissions_members_delete" on public.campus_enrollment_submissions;
create policy "campus_enrollment_submissions_members_delete"
on public.campus_enrollment_submissions
for delete
to authenticated
using (
  public.can_access_account_member(campus_enrollment_submissions.account_id)
);

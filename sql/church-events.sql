create extension if not exists pgcrypto;

create table if not exists public.church_events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  title text not null default '',
  event_date text not null default '',
  location text not null default '',
  event_time text not null default '',
  body text not null default '',
  show_on_live boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.church_events
  add column if not exists event_date text not null default '';

create index if not exists church_events_account_created_idx
on public.church_events (account_id, created_at desc);

create index if not exists church_events_account_live_idx
on public.church_events (account_id, show_on_live, created_at desc);

create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists church_events_set_updated_at on public.church_events;
create trigger church_events_set_updated_at
before update on public.church_events
for each row execute function public.set_updated_at_timestamp();

alter table public.church_events enable row level security;

drop policy if exists "church_events_select_org_members" on public.church_events;
create policy "church_events_select_org_members"
on public.church_events
for select
to authenticated
using (
  exists (
    select 1
    from public.accounts a
    where a.id = church_events.account_id
      and (
        a.owner_user_id = auth.uid()
        or exists (
          select 1
          from public.account_members am
          where am.account_id = a.id
            and am.user_id = auth.uid()
        )
      )
  )
);

drop policy if exists "church_events_insert_org_members" on public.church_events;
create policy "church_events_insert_org_members"
on public.church_events
for insert
to authenticated
with check (
  exists (
    select 1
    from public.accounts a
    where a.id = church_events.account_id
      and (
        a.owner_user_id = auth.uid()
        or exists (
          select 1
          from public.account_members am
          where am.account_id = a.id
            and am.user_id = auth.uid()
        )
      )
  )
);

drop policy if exists "church_events_update_org_members" on public.church_events;
create policy "church_events_update_org_members"
on public.church_events
for update
to authenticated
using (
  exists (
    select 1
    from public.accounts a
    where a.id = church_events.account_id
      and (
        a.owner_user_id = auth.uid()
        or exists (
          select 1
          from public.account_members am
          where am.account_id = a.id
            and am.user_id = auth.uid()
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.accounts a
    where a.id = church_events.account_id
      and (
        a.owner_user_id = auth.uid()
        or exists (
          select 1
          from public.account_members am
          where am.account_id = a.id
            and am.user_id = auth.uid()
        )
      )
  )
);

drop policy if exists "church_events_delete_org_members" on public.church_events;
create policy "church_events_delete_org_members"
on public.church_events
for delete
to authenticated
using (
  exists (
    select 1
    from public.accounts a
    where a.id = church_events.account_id
      and (
        a.owner_user_id = auth.uid()
        or exists (
          select 1
          from public.account_members am
          where am.account_id = a.id
            and am.user_id = auth.uid()
        )
      )
  )
);

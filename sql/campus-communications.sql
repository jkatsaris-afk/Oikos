create extension if not exists pgcrypto;

create table if not exists public.campus_communications (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  channel text not null default 'email',
  status text not null default 'draft',
  delivery_provider text not null default '',
  subject text not null default '',
  message_body text not null default '',
  recipients jsonb not null default '[]'::jsonb,
  recipient_count integer not null default 0,
  external_reference text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists campus_communications_account_sent_idx
on public.campus_communications (account_id, sent_at desc, created_at desc);

create index if not exists campus_communications_account_channel_idx
on public.campus_communications (account_id, channel, status);

create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists campus_communications_set_updated_at on public.campus_communications;
create trigger campus_communications_set_updated_at
before update on public.campus_communications
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

alter table public.campus_communications enable row level security;

drop policy if exists "campus_communications_members_select" on public.campus_communications;
create policy "campus_communications_members_select"
on public.campus_communications
for select
to authenticated
using (
  public.can_access_account_member(campus_communications.account_id)
);

drop policy if exists "campus_communications_members_insert" on public.campus_communications;
create policy "campus_communications_members_insert"
on public.campus_communications
for insert
to authenticated
with check (
  public.can_access_account_member(campus_communications.account_id)
);

drop policy if exists "campus_communications_members_update" on public.campus_communications;
create policy "campus_communications_members_update"
on public.campus_communications
for update
to authenticated
using (
  public.can_access_account_member(campus_communications.account_id)
)
with check (
  public.can_access_account_member(campus_communications.account_id)
);

drop policy if exists "campus_communications_members_delete" on public.campus_communications;
create policy "campus_communications_members_delete"
on public.campus_communications
for delete
to authenticated
using (
  public.can_access_account_member(campus_communications.account_id)
);

-- Grants /admin access to your user.
-- The app checks platform = 'admin' and mode = 'default' for /admin.
-- This avoids ON CONFLICT because your user_access table does not currently
-- have a unique constraint on (user_id, platform, mode).

create extension if not exists pgcrypto;

update public.user_access
set has_access = true
where
  user_id = '7e4ae103-6058-4484-8bee-1386914f32fb'
  and platform = 'admin'
  and mode = 'default';

insert into public.user_access (user_id, platform, mode, has_access)
select
  '7e4ae103-6058-4484-8bee-1386914f32fb',
  'admin',
  'default',
  true
where not exists (
  select 1
  from public.user_access
  where
    user_id = '7e4ae103-6058-4484-8bee-1386914f32fb'
    and platform = 'admin'
    and mode = 'default'
);

create or replace function public.admin_get_global_users()
returns table (
  user_id uuid,
  email text,
  full_name text,
  avatar_url text,
  is_admin boolean,
  is_approved boolean,
  is_paused boolean,
  approval_status text,
  created_at timestamptz,
  last_login timestamptz,
  organization_count integer,
  primary_organization text,
  roles text[],
  platforms text[],
  organizations jsonb,
  access jsonb
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not exists (
    select 1
    from public.user_access ua_admin
    where
      ua_admin.user_id = auth.uid()
      and ua_admin.platform = 'admin'
      and ua_admin.mode = 'default'
      and ua_admin.has_access = true
  ) then
    raise exception 'Admin access required';
  end if;

  return query
  select
    u.id as user_id,
    coalesce(p.email, u.email) as email,
    coalesce(p.full_name, u.raw_user_meta_data->>'full_name', u.email) as full_name,
    coalesce(
      p.metadata->>'avatar_url',
      p.metadata->>'picture',
      u.raw_user_meta_data->>'avatar_url',
      u.raw_user_meta_data->>'picture'
    ) as avatar_url,
    coalesce(p.is_admin, false) as is_admin,
    coalesce(p.is_approved, false) as is_approved,
    lower(coalesce(p.metadata->>'paused', 'false')) in ('true', '1', 'yes') as is_paused,
    case
      when lower(coalesce(p.metadata->>'paused', 'false')) in ('true', '1', 'yes') then 'paused'
      when lower(coalesce(p.metadata->>'approval_status', '')) = 'denied' then 'denied'
      when coalesce(p.is_approved, false) then 'approved'
      else 'pending'
    end as approval_status,
    u.created_at,
    u.last_sign_in_at as last_login,
    coalesce(org_summary.organization_count, 0)::integer as organization_count,
    org_summary.primary_organization,
    coalesce(org_summary.roles, array[]::text[]) as roles,
    coalesce(access_summary.platforms, array[]::text[]) as platforms,
    coalesce(org_summary.organizations, '[]'::jsonb) as organizations,
    coalesce(access_summary.access, '[]'::jsonb) as access
  from auth.users u
  left join public.profiles p
    on p.id = u.id
  left join lateral (
    select
      count(*)::integer as organization_count,
      min(a.name) as primary_organization,
      array_remove(array_agg(distinct am.role), null) as roles,
      jsonb_agg(
        distinct jsonb_build_object(
          'id', a.id,
          'name', a.name,
          'type', a.type,
          'role', am.role,
          'status', am.status
        )
      ) filter (where a.id is not null) as organizations
    from public.account_members am
    left join public.accounts a
      on a.id = am.account_id
    where am.user_id = u.id
  ) org_summary on true
  left join lateral (
    select
      array_remove(array_agg(distinct ua.platform), null) as platforms,
      jsonb_agg(
        distinct jsonb_build_object(
          'platform', ua.platform,
          'mode', ua.mode,
          'has_access', ua.has_access
        )
      ) filter (where ua.platform is not null) as access
    from public.user_access ua
    where ua.user_id = u.id
  ) access_summary on true
  order by u.created_at desc;
end;
$$;

grant execute on function public.admin_get_global_users() to authenticated;

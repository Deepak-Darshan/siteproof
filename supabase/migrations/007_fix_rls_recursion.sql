-- Fix infinite recursion introduced in 006.
-- The project_members SELECT policy queried project_members from within
-- itself, which also got checked, causing Postgres to silently return
-- empty results (breaking project visibility for all users).
--
-- Solution: use a SECURITY DEFINER helper function that reads
-- project_members bypassing RLS. All policies that need to check
-- membership call this function instead of a direct subquery.

create or replace function public.is_project_member(p_project_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.project_members
    where project_id = p_project_id
      and user_id = auth.uid()
  );
$$;

-- ── project_members ────────────────────────────────────────────────────────────

drop policy if exists "Members can view project memberships" on public.project_members;

create policy "Members can view project memberships"
  on public.project_members for select
  using (public.is_project_member(project_id));

-- ── projects ───────────────────────────────────────────────────────────────────
-- Rewrite to use the helper so it doesn't trigger the project_members policy.

drop policy if exists "Members can view their projects" on public.projects;

create policy "Members can view their projects"
  on public.projects for select
  using (public.is_project_member(id));

-- ── profiles ───────────────────────────────────────────────────────────────────

drop policy if exists "Users can read profiles" on public.profiles;

create policy "Users can read profiles"
  on public.profiles for select
  using (
    auth.uid() = id
    or exists (
      select 1
      from public.project_members a
      join public.project_members b on a.project_id = b.project_id
      where a.user_id = auth.uid()
        and b.user_id = profiles.id
    )
  );

-- ── project_invites ────────────────────────────────────────────────────────────
-- The 005 invite policies also reference project_members — rewrite them too.

drop policy if exists "Admins can create invites" on public.project_invites;
drop policy if exists "Members can view project invites" on public.project_invites;

create policy "Admins can create invites"
  on public.project_invites for insert
  with check (
    exists (
      select 1 from public.project_members
      where project_id = project_invites.project_id
        and user_id = auth.uid()
        and role = 'admin'
    )
  );

create policy "Members can view project invites"
  on public.project_invites for select
  using (
    token is not null  -- public token lookup for accept page
    or public.is_project_member(project_id)
  );

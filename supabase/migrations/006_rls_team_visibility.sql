-- Allow project members to see ALL members of projects they belong to
-- (the original policy only let users see their own row).
drop policy if exists "Members can view membership" on public.project_members;

create policy "Members can view project memberships"
  on public.project_members for select
  using (
    exists (
      select 1 from public.project_members pm
      where pm.project_id = project_members.project_id
        and pm.user_id = auth.uid()
    )
  );

-- Allow reading profiles of fellow project members
-- (the original policy only allowed reading one's own profile).
drop policy if exists "Users can read own profile" on public.profiles;

create policy "Users can read profiles"
  on public.profiles for select
  using (
    -- Own profile always readable
    auth.uid() = id
    or
    -- Profiles of people who share at least one project
    exists (
      select 1
      from public.project_members a
      join public.project_members b on a.project_id = b.project_id
      where a.user_id = auth.uid()
        and b.user_id = profiles.id
    )
  );

-- Allow a project owner to insert themselves as admin at creation time.
-- Without this, the creator can't insert into project_members because the
-- existing "Project admins can invite" policy requires them to already be a member.
create policy "Owner can self-insert as admin"
  on public.project_members for insert
  with check (
    user_id = auth.uid()
    and role = 'admin'
    and exists (
      select 1 from public.projects
      where id = project_members.project_id
        and owner_id = auth.uid()
    )
  );

-- Atomic project creation: inserts the project and adds the creator as admin
-- in a single transaction. SECURITY DEFINER lets it write project_members
-- regardless of RLS, while auth.uid() keeps it scoped to the calling user.
create or replace function public.create_project(
  p_name    text,
  p_address text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
begin
  insert into projects (name, address, owner_id)
  values (p_name, p_address, auth.uid())
  returning id into v_project_id;

  insert into project_members (project_id, user_id, role)
  values (v_project_id, auth.uid(), 'admin');

  return v_project_id;
end;
$$;

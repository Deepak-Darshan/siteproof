-- project_invites: token-based email invitations
create table public.project_invites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  invited_by uuid not null references public.profiles(id),
  email text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  token text not null unique default encode(gen_random_bytes(32), 'hex'),
  accepted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);

alter table public.project_invites enable row level security;

-- Project admins can create invites
create policy "Admins can create invites"
  on public.project_invites for insert
  with check (
    exists (
      select 1 from public.project_members pm
      where pm.project_id = project_invites.project_id
      and pm.user_id = auth.uid()
      and pm.role = 'admin'
    )
  );

-- Project members can view invites for their projects
create policy "Members can view project invites"
  on public.project_invites for select
  using (
    exists (
      select 1 from public.project_members pm
      where pm.project_id = project_invites.project_id
      and pm.user_id = auth.uid()
    )
  );

-- The public can look up an invite by token (for the accept page)
create policy "Anyone can look up invite by token"
  on public.project_invites for select
  using (token is not null);

-- Service role function for accepting an invite
create or replace function public.accept_invite(p_token text)
returns json as $$
declare
  v_invite public.project_invites;
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return json_build_object('error', 'Not authenticated');
  end if;

  -- Find and lock the invite
  select * into v_invite
  from public.project_invites
  where token = p_token
    and accepted_at is null
    and expires_at > now()
  for update;

  if not found then
    return json_build_object('error', 'Invite not found or expired');
  end if;

  -- Add to project_members (ignore if already a member)
  insert into public.project_members (project_id, user_id, role)
  values (v_invite.project_id, v_user_id, v_invite.role)
  on conflict (project_id, user_id) do nothing;

  -- Mark accepted
  update public.project_invites
  set accepted_at = now()
  where id = v_invite.id;

  return json_build_object(
    'project_id', v_invite.project_id,
    'role', v_invite.role
  );
end;
$$ language plpgsql security definer;

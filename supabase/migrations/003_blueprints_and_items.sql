-- ============================================================
-- blueprints
-- One row per uploaded floor plan sheet. A project may have
-- multiple sheets (e.g. "Ground Floor", "Level 1").
-- file_path is the Supabase Storage object path; width/height
-- are the original image dimensions used by the viewer to
-- place pins at resolution-independent normalised coordinates.
-- ============================================================

create table public.blueprints (
  id          uuid        primary key default gen_random_uuid(),
  project_id  uuid        not null references public.projects(id) on delete cascade,
  label       text        not null,
  file_path   text        not null,
  width       integer     not null check (width > 0),
  height      integer     not null check (height > 0),
  created_at  timestamptz not null default now()
);

alter table public.blueprints enable row level security;

-- Index for the common query: all blueprints for a project.
create index blueprints_project_id_idx on public.blueprints(project_id);

-- ============================================================
-- punch_items
-- Each row is a defect or task pinned to a location on a
-- blueprint. pin_x / pin_y are normalised 0–1 floats so
-- coordinates survive blueprint resizing or re-upload.
-- blueprint_id is nullable to allow items that aren't yet
-- pinned to a sheet (e.g. created from a list view).
-- pin_x / pin_y must both be present when blueprint_id is set.
-- ============================================================

create table public.punch_items (
  id            uuid        primary key default gen_random_uuid(),
  project_id    uuid        not null references public.projects(id) on delete cascade,
  blueprint_id  uuid        references public.blueprints(id) on delete set null,
  title         text        not null,
  description   text,
  severity      text        not null default 'major'
                              check (severity in ('critical', 'major', 'minor')),
  trade         text        not null default 'other'
                              check (trade in (
                                'electrical', 'plumbing', 'carpentry',
                                'painting', 'tiling', 'hvac',
                                'structural', 'other'
                              )),
  status        text        not null default 'open'
                              check (status in ('open', 'in_review', 'resolved')),
  pin_x         float,
  pin_y         float,
  assigned_to   uuid        references public.profiles(id) on delete set null,
  created_by    uuid        not null references public.profiles(id),
  created_at    timestamptz not null default now(),
  resolved_at   timestamptz,

  -- pin coordinates are required together
  constraint pin_coords_both_or_neither
    check (
      (pin_x is null and pin_y is null)
      or (pin_x is not null and pin_y is not null)
    ),
  -- normalised range 0–1
  constraint pin_x_range check (pin_x is null or (pin_x >= 0 and pin_x <= 1)),
  constraint pin_y_range check (pin_y is null or (pin_y >= 0 and pin_y <= 1)),
  -- resolved_at must be set iff status = 'resolved'
  constraint resolved_at_consistency
    check (
      (status = 'resolved' and resolved_at is not null)
      or (status <> 'resolved' and resolved_at is null)
    )
);

alter table public.punch_items enable row level security;

-- Common query patterns: items for a project, items on a blueprint.
create index punch_items_project_id_idx   on public.punch_items(project_id);
create index punch_items_blueprint_id_idx on public.punch_items(blueprint_id);

-- ============================================================
-- Helper: is the calling user a member of the given project?
-- Used by multiple RLS policies to avoid repeating the sub-select.
-- ============================================================

create or replace function public.is_project_member(p_project_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from project_members
    where project_id = p_project_id
      and user_id    = auth.uid()
  )
$$;

-- ============================================================
-- Helper: is the calling user an admin of the given project?
-- ============================================================

create or replace function public.is_project_admin(p_project_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from project_members
    where project_id = p_project_id
      and user_id    = auth.uid()
      and role       = 'admin'
  )
$$;

-- ============================================================
-- RLS — blueprints
--
-- Read:          any project member
-- Insert/Update/Delete: project admins only
-- ============================================================

create policy "Members can view blueprints"
  on public.blueprints for select
  using (is_project_member(project_id));

create policy "Admins can insert blueprints"
  on public.blueprints for insert
  with check (is_project_admin(project_id));

create policy "Admins can update blueprints"
  on public.blueprints for update
  using (is_project_admin(project_id));

create policy "Admins can delete blueprints"
  on public.blueprints for delete
  using (is_project_admin(project_id));

-- ============================================================
-- RLS — punch_items
--
-- Read:   any project member
-- Insert: any project member (subs can log defects they find)
-- Update: any project member (subs need to move status to
--         in_review; GC moves to resolved — enforced in app)
-- Delete: project admins only
-- ============================================================

create policy "Members can view items"
  on public.punch_items for select
  using (is_project_member(project_id));

create policy "Members can insert items"
  on public.punch_items for insert
  with check (
    is_project_member(project_id)
    and created_by = auth.uid()
  );

create policy "Members can update items"
  on public.punch_items for update
  using (is_project_member(project_id));

create policy "Admins can delete items"
  on public.punch_items for delete
  using (is_project_admin(project_id));

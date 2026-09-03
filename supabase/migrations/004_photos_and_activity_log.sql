-- ============================================================
-- photos
-- One row per photo attached to a punch item.
-- type = 'before' (initial defect) | 'after' (resolution proof).
-- taken_at comes from EXIF or falls back to upload time.
-- lat/lng are optional GPS coordinates from EXIF.
-- ============================================================

create table public.photos (
  id           uuid        primary key default gen_random_uuid(),
  item_id      uuid        not null references public.punch_items(id) on delete cascade,
  type         text        not null check (type in ('before', 'after')),
  file_path    text        not null,
  taken_at     timestamptz not null default now(),
  lat          float,
  lng          float,
  uploaded_by  uuid        not null references public.profiles(id),
  created_at   timestamptz not null default now()
);

alter table public.photos enable row level security;

create index photos_item_id_idx on public.photos(item_id);

-- Photos are visible to any member of the parent project.
-- We join through punch_items → project_id for the RLS check.
create policy "Members can view photos"
  on public.photos for select
  using (
    exists (
      select 1 from public.punch_items pi
      where pi.id = photos.item_id
        and is_project_member(pi.project_id)
    )
  );

create policy "Members can insert photos"
  on public.photos for insert
  with check (
    exists (
      select 1 from public.punch_items pi
      where pi.id = photos.item_id
        and is_project_member(pi.project_id)
    )
    and uploaded_by = auth.uid()
  );

-- ============================================================
-- activity_log
-- Append-only audit trail. Rows are written by the application
-- on key events: item created, photo added, status changed.
-- ============================================================

create table public.activity_log (
  id          uuid        primary key default gen_random_uuid(),
  project_id  uuid        not null references public.projects(id) on delete cascade,
  item_id     uuid        references public.punch_items(id) on delete set null,
  user_id     uuid        not null references public.profiles(id),
  action      text        not null
                check (action in (
                  'item_created', 'photo_added', 'status_changed',
                  'item_resolved', 'item_reopened'
                )),
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

alter table public.activity_log enable row level security;

create index activity_log_project_id_idx on public.activity_log(project_id);
create index activity_log_item_id_idx    on public.activity_log(item_id);

create policy "Members can view activity"
  on public.activity_log for select
  using (is_project_member(project_id));

create policy "Members can insert activity"
  on public.activity_log for insert
  with check (
    is_project_member(project_id)
    and user_id = auth.uid()
  );

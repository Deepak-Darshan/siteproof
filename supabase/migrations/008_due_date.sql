-- Add optional due date to punch items.
alter table public.punch_items
  add column due_date date;

-- Index for the overdue queries (due_date < today AND status != 'resolved').
create index punch_items_due_date_idx on public.punch_items(due_date)
  where due_date is not null;

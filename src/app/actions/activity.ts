"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActivityAction } from "@/types/database";

export type ActivityEntry = {
  id: string;
  action: ActivityAction;
  metadata: Record<string, unknown> | null;
  created_at: string;
  project_id: string;
  item_id: string | null;
  profiles: { full_name: string } | null;
  punch_items: { id: string; title: string } | null;
};

export type FetchActivityResult =
  | { entries: ActivityEntry[]; hasMore: boolean }
  | { error: string };

const PAGE_SIZE = 20;

export async function fetchActivity(offset = 0): Promise<FetchActivityResult> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("activity_log")
    .select(
      "id, action, metadata, created_at, project_id, item_id, profiles(full_name), punch_items(id, title)"
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE);
  // Fetch one extra to know if there's a next page.

  if (error) return { error: error.message };

  const rows = (data ?? []) as unknown as ActivityEntry[];
  const hasMore = rows.length > PAGE_SIZE;

  return { entries: hasMore ? rows.slice(0, PAGE_SIZE) : rows, hasMore };
}

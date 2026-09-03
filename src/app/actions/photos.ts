"use server";

import { createClient } from "@/lib/supabase/server";
import type { Photo, PhotoType } from "@/types/database";

export type SavePhotoResult =
  | { success: true; photo: Photo }
  | { error: string };

/**
 * Save photo metadata to the DB after the file has already been uploaded
 * to Supabase Storage directly from the browser.
 *
 * Do NOT pass a File here — only the storage path and EXIF metadata.
 */
export async function savePhoto(
  itemId: string,
  projectId: string,
  type: PhotoType,
  filePath: string,
  takenAt: string,
  lat: number | null,
  lng: number | null,
): Promise<SavePhotoResult> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  if (!itemId || !projectId || !filePath) return { error: "Missing required fields." };
  if (type !== "before" && type !== "after") return { error: "Invalid photo type." };

  const { data, error: dbError } = await supabase
    .from("photos")
    .insert({
      item_id: itemId,
      type,
      file_path: filePath,
      taken_at: takenAt || new Date().toISOString(),
      lat: lat ?? null,
      lng: lng ?? null,
      uploaded_by: user.id,
    })
    .select()
    .single();

  if (dbError) {
    // Best-effort: remove the orphaned storage object.
    await supabase.storage.from("photos").remove([filePath]);
    return { error: dbError.message };
  }

  await supabase.from("activity_log").insert({
    project_id: projectId,
    item_id: itemId,
    user_id: user.id,
    action: "photo_added",
    metadata: { photo_id: data.id, type },
  });

  return { success: true, photo: data as Photo };
}

// ── Status update ─────────────────────────────────────────────────────────────

export type UpdateItemStatusResult =
  | { success: true }
  | { error: string };

export async function updateItemStatus(
  itemId: string,
  projectId: string,
  status: "open" | "in_review" | "resolved",
): Promise<UpdateItemStatusResult> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const update: Record<string, unknown> = { status };
  if (status === "resolved") {
    update.resolved_at = new Date().toISOString();
  } else {
    update.resolved_at = null;
  }

  const { error } = await supabase
    .from("punch_items")
    .update(update)
    .eq("id", itemId);

  if (error) return { error: error.message };

  const action =
    status === "resolved" ? "item_resolved" :
    status === "open"     ? "item_reopened" :
                            "status_changed";

  await supabase.from("activity_log").insert({
    project_id: projectId,
    item_id: itemId,
    user_id: user.id,
    action,
    metadata: { new_status: status },
  });

  return { success: true };
}

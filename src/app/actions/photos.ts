"use server";

import { createClient } from "@/lib/supabase/server";
import type { Photo, PhotoType } from "@/types/database";

export type UploadPhotoResult =
  | { success: true; photo: Photo }
  | { error: string };

/**
 * Upload a photo file to Supabase Storage and write a row to the photos table.
 * Called with FormData so it can be invoked from a client component action.
 *
 * Expected FormData fields:
 *   file      — Blob/File
 *   item_id   — uuid
 *   project_id — uuid   (used to build the storage path)
 *   type      — "before" | "after"
 *   taken_at  — ISO string (from EXIF or Date.now())
 *   lat       — number string or empty
 *   lng       — number string or empty
 */
export async function uploadPhoto(formData: FormData): Promise<UploadPhotoResult> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const file     = formData.get("file") as File | null;
  const itemId   = formData.get("item_id") as string | null;
  const projectId = formData.get("project_id") as string | null;
  const type     = formData.get("type") as PhotoType | null;
  const takenAtStr = formData.get("taken_at") as string | null;
  const latStr   = formData.get("lat") as string | null;
  const lngStr   = formData.get("lng") as string | null;

  if (!file || !itemId || !projectId || !type) {
    return { error: "Missing required fields." };
  }
  if (type !== "before" && type !== "after") {
    return { error: "Invalid photo type." };
  }

  const takenAt = takenAtStr ? new Date(takenAtStr).toISOString() : new Date().toISOString();
  const lat = latStr ? parseFloat(latStr) : null;
  const lng = lngStr ? parseFloat(lngStr) : null;

  // Build storage path: {project_id}/{item_id}/{type}_{timestamp}.jpg
  const timestamp = Date.now();
  const filePath = `${projectId}/${itemId}/${type}_${timestamp}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from("photos")
    .upload(filePath, file, { contentType: "image/jpeg", upsert: false });

  if (uploadError) return { error: uploadError.message };

  // Write metadata row.
  const { data, error: dbError } = await supabase
    .from("photos")
    .insert({
      item_id: itemId,
      type,
      file_path: filePath,
      taken_at: takenAt,
      lat: lat ?? null,
      lng: lng ?? null,
      uploaded_by: user.id,
    })
    .select()
    .single();

  if (dbError) {
    // Best-effort: remove orphaned storage object.
    await supabase.storage.from("photos").remove([filePath]);
    return { error: dbError.message };
  }

  // Log the activity.
  await supabase.from("activity_log").insert({
    project_id: projectId,
    item_id: itemId,
    user_id: user.id,
    action: "photo_added",
    metadata: { photo_id: data.id, type },
  });

  return { success: true, photo: data as Photo };
}

/**
 * Mark a punch item as in_review after a sub uploads an after photo,
 * or resolved if the current user is an admin and the status is in_review.
 */
export type UpdateItemStatusResult =
  | { success: true }
  | { error: string };

export async function updateItemStatus(
  itemId: string,
  projectId: string,
  status: "open" | "in_review" | "resolved"
): Promise<UpdateItemStatusResult> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const update: Record<string, unknown> = { status };
  if (status === "resolved") {
    update.resolved_at = new Date().toISOString();
  } else {
    // Clearing resolved_at when moving back to open or in_review.
    update.resolved_at = null;
  }

  const { error } = await supabase
    .from("punch_items")
    .update(update)
    .eq("id", itemId);

  if (error) return { error: error.message };

  const action =
    status === "resolved"  ? "item_resolved"  :
    status === "open"      ? "item_reopened"   :
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

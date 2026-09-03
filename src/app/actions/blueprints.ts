"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type UploadBlueprintResult =
  | { success: true; blueprintId: string }
  | { error: string };

/**
 * Upload a blueprint image to Supabase Storage and insert a row
 * into the blueprints table.
 *
 * Expected FormData fields:
 *   file       — image File (JPG/PNG)
 *   project_id — uuid
 *   label      — string (e.g. "Ground Floor")
 *   width      — number string (original image width in px)
 *   height     — number string (original image height in px)
 */
export async function uploadBlueprint(
  formData: FormData
): Promise<UploadBlueprintResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const file = formData.get("file") as File | null;
  const projectId = formData.get("project_id") as string | null;
  const label = formData.get("label") as string | null;
  const widthStr = formData.get("width") as string | null;
  const heightStr = formData.get("height") as string | null;

  if (!file || !projectId || !label) {
    return { error: "Missing required fields (file, project_id, label)." };
  }

  const width = widthStr ? parseInt(widthStr, 10) : 0;
  const height = heightStr ? parseInt(heightStr, 10) : 0;

  if (!width || !height || width <= 0 || height <= 0) {
    return { error: "Invalid image dimensions." };
  }

  // Build storage path: blueprints/{project_id}/{timestamp}_{filename}
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `${projectId}/${timestamp}_${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("blueprints")
    .upload(filePath, file, {
      contentType: file.type || "image/png",
      upsert: false,
    });

  if (uploadError) return { error: uploadError.message };

  // Insert the blueprints row.
  const { data, error: dbError } = await supabase
    .from("blueprints")
    .insert({
      project_id: projectId,
      label,
      file_path: filePath,
      width,
      height,
    })
    .select("id")
    .single();

  if (dbError) {
    // Clean up orphaned storage object.
    await supabase.storage.from("blueprints").remove([filePath]);
    return { error: dbError.message };
  }

  revalidatePath(`/dashboard/projects/${projectId}`);

  return { success: true, blueprintId: data.id };
}

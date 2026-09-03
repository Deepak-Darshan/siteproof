"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type SaveBlueprintResult =
  | { success: true; blueprintId: string }
  | { error: string };

/**
 * Save a blueprint row after the file has already been uploaded to
 * Supabase Storage directly from the browser.
 *
 * No file is passed here — only the storage path and image metadata.
 */
export async function saveBlueprint(
  projectId: string,
  label: string,
  filePath: string,
  width: number,
  height: number,
): Promise<SaveBlueprintResult> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    if (!projectId || !label || !filePath || width <= 0 || height <= 0) {
      return { error: "Missing required fields." };
    }

    const { data, error: dbError } = await supabase
      .from("blueprints")
      .insert({ project_id: projectId, label, file_path: filePath, width, height })
      .select("id")
      .single();

    if (dbError) {
      // Clean up the orphaned storage object.
      await supabase.storage.from("blueprints").remove([filePath]);
      return { error: `Database insert failed: ${dbError.message}` };
    }

    revalidatePath(`/dashboard/projects/${projectId}`);
    return { success: true, blueprintId: data.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `Save failed: ${message}` };
  }
}

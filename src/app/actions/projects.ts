"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const CreateProjectSchema = z.object({
  name: z.string().min(1, { error: "Project name is required." }).trim(),
  address: z.string().trim().optional(),
});

type CreateProjectState =
  | { errors?: { name?: string[]; address?: string[] }; message?: string }
  | { success: true; projectId: string }
  | undefined;

export async function createProject(
  _state: CreateProjectState,
  formData: FormData
): Promise<CreateProjectState> {
  const validated = CreateProjectSchema.safeParse({
    name: formData.get("name"),
    address: formData.get("address") || undefined,
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_project", {
    p_name: validated.data.name,
    p_address: validated.data.address ?? null,
  });

  if (error) {
    return { message: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true, projectId: data as string };
}

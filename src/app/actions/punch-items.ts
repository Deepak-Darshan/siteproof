"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { PunchItem } from "@/types/database";

const CreatePunchItemSchema = z.object({
  title: z.string().min(1, { error: "Title is required." }).trim(),
  description: z.string().trim().optional(),
  severity: z.enum(["critical", "major", "minor"]),
  trade: z.enum([
    "electrical",
    "plumbing",
    "carpentry",
    "painting",
    "tiling",
    "hvac",
    "structural",
    "other",
  ]),
  project_id: z.string().uuid(),
  blueprint_id: z.string().uuid(),
  pin_x: z.string().transform((v) => parseFloat(v)),
  pin_y: z.string().transform((v) => parseFloat(v)),
});

export type CreatePunchItemState =
  | {
      errors?: {
        title?: string[];
        description?: string[];
        severity?: string[];
        trade?: string[];
      };
      message?: string;
    }
  | { success: true; item: PunchItem }
  | undefined;

export async function createPunchItem(
  _state: CreatePunchItemState,
  formData: FormData
): Promise<CreatePunchItemState> {
  const validated = CreatePunchItemSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    severity: formData.get("severity"),
    trade: formData.get("trade"),
    project_id: formData.get("project_id"),
    blueprint_id: formData.get("blueprint_id"),
    pin_x: formData.get("pin_x"),
    pin_y: formData.get("pin_y"),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { message: "Not authenticated." };

  const { data, error } = await supabase
    .from("punch_items")
    .insert({
      title: validated.data.title,
      description: validated.data.description ?? null,
      severity: validated.data.severity,
      trade: validated.data.trade,
      project_id: validated.data.project_id,
      blueprint_id: validated.data.blueprint_id,
      pin_x: validated.data.pin_x,
      pin_y: validated.data.pin_y,
      created_by: user.id,
      status: "open",
    })
    .select()
    .single();

  if (error) return { message: error.message };

  const item = data as PunchItem;

  await supabase.from("activity_log").insert({
    project_id: item.project_id,
    item_id: item.id,
    user_id: user.id,
    action: "item_created",
    metadata: { title: item.title, severity: item.severity, trade: item.trade },
  });

  return { success: true, item };
}

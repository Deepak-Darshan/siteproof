"use server";

import { createClient } from "@/lib/supabase/server";
import type { ProjectInvite } from "@/types/database";

export type CreateInviteResult =
  | { success: true; invite: ProjectInvite }
  | { error: string };

export async function createInvite(
  projectId: string,
  email: string,
  role: "admin" | "member",
): Promise<CreateInviteResult> {
  if (!projectId || !email || !role) return { error: "Missing required fields." };
  if (role !== "admin" && role !== "member") return { error: "Invalid role." };

  const emailLower = email.trim().toLowerCase();
  if (!emailLower.includes("@")) return { error: "Invalid email address." };

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  // Verify caller is an admin on this project.
  const { data: membership } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .single();

  if (membership?.role !== "admin") return { error: "Only project admins can invite members." };

  // Check for existing pending invite for this email.
  const { data: existing } = await supabase
    .from("project_invites")
    .select("id")
    .eq("project_id", projectId)
    .eq("email", emailLower)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (existing) return { error: "A pending invite already exists for this email." };

  const { data, error } = await supabase
    .from("project_invites")
    .insert({
      project_id: projectId,
      invited_by: user.id,
      email: emailLower,
      role,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  return { success: true, invite: data as ProjectInvite };
}

export type AcceptInviteResult =
  | { success: true; projectId: string }
  | { error: string };

export async function acceptInvite(token: string): Promise<AcceptInviteResult> {
  if (!token) return { error: "Invalid invite link." };

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in to accept an invite." };

  const { data, error } = await supabase.rpc("accept_invite", { p_token: token });

  if (error) return { error: error.message };
  if (data?.error) return { error: data.error };

  return { success: true, projectId: data.project_id };
}

import { createClient } from "@/lib/supabase/server";
import { ProjectsList } from "./ProjectsList";
import type { Project } from "@/types/database";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <main className="max-w-2xl mx-auto px-4 pt-6 pb-4">
      <ProjectsList projects={(projects as Project[]) ?? []} />
    </main>
  );
}

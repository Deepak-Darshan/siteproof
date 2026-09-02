import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BlueprintViewer } from "@/components/BlueprintViewer";
import type { Blueprint, PunchItem } from "@/types/database";

type Props = {
  params: Promise<{ id: string; blueprintId: string }>;
};

export default async function BlueprintPage({ params }: Props) {
  const { id: projectId, blueprintId } = await params;
  const supabase = await createClient();

  // Fetch blueprint (RLS ensures membership)
  const { data: blueprint, error } = await supabase
    .from("blueprints")
    .select("*")
    .eq("id", blueprintId)
    .eq("project_id", projectId)
    .single();

  if (error || !blueprint) notFound();

  // Generate a 1-hour signed URL for the private storage object
  const { data: urlData } = await supabase.storage
    .from("blueprints")
    .createSignedUrl((blueprint as Blueprint).file_path, 60 * 60);

  if (!urlData?.signedUrl) notFound();

  // Fetch existing punch items pinned to this blueprint
  const { data: items } = await supabase
    .from("punch_items")
    .select("*")
    .eq("blueprint_id", blueprintId)
    .order("created_at", { ascending: true });

  return (
    <div className="flex flex-col" style={{ height: "100dvh" }}>
      {/* Header */}
      <header className="shrink-0 flex items-center gap-3 h-13 px-4 bg-white border-b border-zinc-200 z-30">
        <Link
          href={`/dashboard/projects/${projectId}`}
          className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-zinc-100 transition-colors text-zinc-600"
          aria-label="Back to project"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <span className="font-semibold text-zinc-900 text-sm truncate">
          {(blueprint as Blueprint).label}
        </span>
        <span className="ml-auto text-xs text-zinc-400 shrink-0">
          Tap blueprint to pin
        </span>
      </header>

      {/* Viewer fills remaining height (dvh - header 52px - bottom nav 56px) */}
      <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        <BlueprintViewer
          blueprintId={blueprintId}
          projectId={projectId}
          imageUrl={urlData.signedUrl}
          initialItems={(items as PunchItem[]) ?? []}
        />
      </div>
    </div>
  );
}

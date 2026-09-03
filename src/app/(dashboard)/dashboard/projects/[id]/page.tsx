import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import BlueprintUpload from "@/components/BlueprintUpload";
import type { Blueprint, Project } from "@/types/database";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ProjectPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !project) notFound();

  const { data: blueprints } = await supabase
    .from("blueprints")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: true });

  const p = project as Project;
  const sheets = (blueprints as Blueprint[]) ?? [];

  return (
    <main className="max-w-2xl mx-auto px-4 pt-6 pb-4">
      {/* Back + header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/dashboard"
          className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-zinc-100 transition-colors text-zinc-600"
          aria-label="Back to projects"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <div className="min-w-0">
          <h1 className="font-bold text-zinc-900 text-xl truncate">{p.name}</h1>
          {p.address && (
            <p className="text-sm text-zinc-500 truncate">{p.address}</p>
          )}
        </div>
      </div>

      {/* Blueprints section */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">
          Blueprints
        </h2>

        {sheets.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-14 gap-3 bg-white rounded-xl border border-zinc-200">
            <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-400">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <p className="text-zinc-900 font-medium text-sm">No blueprints yet</p>
            <p className="text-zinc-500 text-xs max-w-xs">
              Upload a floor plan to start pinning defects.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {sheets.map((bp) => (
              <li key={bp.id}>
                <Link
                  href={`/dashboard/projects/${id}/blueprint/${bp.id}`}
                  className="flex items-center gap-3 bg-white rounded-xl border border-zinc-200 px-4 py-3.5 hover:border-zinc-300 hover:shadow-sm transition-all active:bg-zinc-50"
                >
                  <div className="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-400 shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-zinc-900 text-sm truncate">{bp.label}</p>
                    <p className="text-xs text-zinc-400">{bp.width} × {bp.height}px</p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-300 shrink-0" aria-hidden="true">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {/* Upload button */}
        <div className="mt-4">
          <BlueprintUpload projectId={id} />
        </div>
      </section>
    </main>
  );
}

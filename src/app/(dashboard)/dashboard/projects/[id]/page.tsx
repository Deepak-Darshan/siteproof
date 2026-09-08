import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import BlueprintUpload from "@/components/BlueprintUpload";
import { ReportButton } from "@/components/ReportButton";
import { TeamSection } from "@/components/TeamSection";
import type { Blueprint, Profile, Project, ProjectMember } from "@/types/database";

type Props = {
  params: Promise<{ id: string }>;
};

type MemberWithProfile = ProjectMember & {
  profiles: Pick<Profile, "full_name" | "company">;
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

  const [{ data: blueprints }, { data: { user } }, { data: membersData }, { data: itemsData }] =
    await Promise.all([
      supabase
        .from("blueprints")
        .select("*")
        .eq("project_id", id)
        .order("created_at", { ascending: true }),
      supabase.auth.getUser(),
      supabase
        .from("project_members")
        .select("project_id, user_id, role, invited_at, profiles(full_name, company)")
        .eq("project_id", id)
        .order("invited_at", { ascending: true }),
      supabase
        .from("punch_items")
        .select("status, due_date")
        .eq("project_id", id),
    ]);

  const p = project as Project;
  const sheets = (blueprints as Blueprint[]) ?? [];
  const members = (membersData as unknown as MemberWithProfile[]) ?? [];

  // ── Item stats ────────────────────────────────────────────────────────────
  type ItemRow = { status: string; due_date: string | null };
  const allItems = (itemsData as ItemRow[]) ?? [];
  const todayStr = new Date().toISOString().slice(0, 10);
  const stats = {
    open:     allItems.filter((i) => i.status === "open").length,
    inReview: allItems.filter((i) => i.status === "in_review").length,
    resolved: allItems.filter((i) => i.status === "resolved").length,
    overdue:  allItems.filter((i) => i.due_date && i.due_date < todayStr && i.status !== "resolved").length,
    total:    allItems.length,
  };

  const currentMember = user
    ? members.find((m) => m.user_id === user.id)
    : undefined;
  const isAdmin = currentMember?.role === "admin";

  return (
    <main className="max-w-2xl mx-auto px-4 pt-6 pb-4 space-y-8">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-zinc-100 transition-colors text-zinc-600 shrink-0"
          aria-label="Back to projects"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="font-bold text-zinc-900 text-xl truncate">{p.name}</h1>
          {p.address && (
            <p className="text-sm text-zinc-500 truncate">{p.address}</p>
          )}
        </div>
        {/* Report download */}
        <ReportButton projectId={id} />
      </div>

      {/* Item stats */}
      {stats.total > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Open",      value: stats.open,     color: "text-zinc-900" },
            { label: "In Review", value: stats.inReview, color: "text-amber-600" },
            { label: "Resolved",  value: stats.resolved, color: "text-green-600" },
            { label: "Overdue",   value: stats.overdue,  color: stats.overdue > 0 ? "text-red-600" : "text-zinc-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-zinc-200 px-3 py-3 text-center">
              <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
              <p className="text-xs text-zinc-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Punch list link */}
      <Link
        href={`/dashboard/projects/${id}/items`}
        className="flex items-center justify-between bg-white rounded-xl border border-zinc-200 px-4 py-3.5 hover:border-zinc-300 hover:shadow-sm transition-all active:bg-zinc-50"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-400 shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          </div>
          <p className="font-medium text-zinc-900 text-sm">Punch List</p>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-300 shrink-0" aria-hidden="true">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </Link>

      {/* Team section */}
      <TeamSection projectId={id} members={members} isAdmin={isAdmin} />

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

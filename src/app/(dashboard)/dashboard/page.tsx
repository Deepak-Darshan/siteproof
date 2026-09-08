import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ResolutionChart, type WeekBucket } from "@/components/ResolutionChart";
import { NewProjectButton } from "@/components/NewProjectButton";
import type { Project, PunchItem } from "@/types/database";

// ── Week helpers ───────────────────────────────────────────────────────────────

function weekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  // Monday-anchored week
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d.toISOString().slice(0, 10);
}

function buildWeekBuckets(resolvedItems: Pick<PunchItem, "resolved_at">[]): WeekBucket[] {
  const buckets: WeekBucket[] = [];
  const now = new Date();
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    const key = weekStart(d);
    const label = new Date(key + "T00:00:00").toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
    });
    buckets.push({ label, count: 0, _key: key } as WeekBucket & { _key: string });
  }

  for (const item of resolvedItems) {
    if (!item.resolved_at) continue;
    const key = weekStart(new Date(item.resolved_at));
    const bucket = (buckets as (WeekBucket & { _key: string })[]).find((b) => b._key === key);
    if (bucket) bucket.count++;
  }

  // Strip the internal _key before returning
  return buckets.map(({ label, count }) => ({ label, count }));
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient();

  // Fetch all projects the user belongs to.
  const { data: projectsData } = await supabase
    .from("projects")
    .select("id, name, address, status, created_at")
    .order("created_at", { ascending: false });

  const projects = (projectsData as Project[]) ?? [];
  const projectIds = projects.map((p) => p.id);

  // Fetch minimal punch item data for all projects in one query.
  let items: Pick<PunchItem, "id" | "project_id" | "status" | "due_date" | "resolved_at">[] = [];
  if (projectIds.length > 0) {
    const { data } = await supabase
      .from("punch_items")
      .select("id, project_id, status, due_date, resolved_at")
      .in("project_id", projectIds);
    items = (data ?? []) as typeof items;
  }

  // ── Portfolio-level stats ──────────────────────────────────────────────────

  const todayStr = today();
  const totalItems   = items.length;
  const openItems    = items.filter((i) => i.status === "open").length;
  const resolvedItems = items.filter((i) => i.status === "resolved");
  const overdueItems = items.filter(
    (i) => i.due_date && i.due_date < todayStr && i.status !== "resolved"
  ).length;
  const resolutionRate =
    totalItems > 0 ? Math.round((resolvedItems.length / totalItems) * 100) : 0;

  const weeklyData = buildWeekBuckets(resolvedItems);

  // ── Per-project stats ──────────────────────────────────────────────────────

  type ProjectRow = {
    project: Project;
    total: number;
    open: number;
    inReview: number;
    resolved: number;
    overdue: number;
    progress: number;
  };

  const projectRows: ProjectRow[] = projects.map((project) => {
    const pItems = items.filter((i) => i.project_id === project.id);
    const pResolved = pItems.filter((i) => i.status === "resolved").length;
    const pOpen     = pItems.filter((i) => i.status === "open").length;
    const pInReview = pItems.filter((i) => i.status === "in_review").length;
    const pOverdue  = pItems.filter(
      (i) => i.due_date && i.due_date < todayStr && i.status !== "resolved"
    ).length;
    const progress  = pItems.length > 0 ? Math.round((pResolved / pItems.length) * 100) : 0;
    return {
      project,
      total: pItems.length,
      open: pOpen,
      inReview: pInReview,
      resolved: pResolved,
      overdue: pOverdue,
      progress,
    };
  });

  return (
    <main className="max-w-2xl mx-auto px-4 pt-6 pb-24 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-900">Dashboard</h1>
        <NewProjectButton />
      </div>

      {projects.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* ── Stat cards ── */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Projects"   value={projects.length} />
            <StatCard label="Total items" value={totalItems} />
            <StatCard label="Open"        value={openItems} />
            <StatCard
              label="Overdue"
              value={overdueItems}
              highlight={overdueItems > 0}
            />
          </div>

          {/* Resolution rate + chart */}
          <section className="bg-white rounded-xl border border-zinc-200 p-4 space-y-3">
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-semibold text-zinc-700">Resolved this period</p>
              <span className="text-xs text-zinc-400">{resolutionRate}% overall</span>
            </div>
            <ResolutionChart data={weeklyData} />
            <p className="text-xs text-zinc-400 text-center">Items resolved per week (last 8 weeks)</p>
          </section>

          {/* ── Projects list ── */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">Projects</h2>
            <ul className="space-y-2">
              {projectRows.map((row) => (
                <li key={row.project.id}>
                  <Link
                    href={`/dashboard/projects/${row.project.id}`}
                    className="block bg-white rounded-xl border border-zinc-200 p-4 hover:border-zinc-300 hover:shadow-sm transition-all active:bg-zinc-50"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-zinc-900 truncate">{row.project.name}</p>
                        {row.project.address && (
                          <p className="text-xs text-zinc-400 mt-0.5 truncate">{row.project.address}</p>
                        )}
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        {row.overdue > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                            {row.overdue} overdue
                          </span>
                        )}
                        <span className="text-xs text-zinc-400 tabular-nums">
                          {row.open} open / {row.total} total
                        </span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all"
                          style={{ width: `${row.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-zinc-400 tabular-nums shrink-0 w-9 text-right">
                        {row.progress}%
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight
          ? "border-red-200 bg-red-50"
          : "border-zinc-200 bg-white"
      }`}
    >
      <p className={`text-2xl font-bold tabular-nums ${highlight ? "text-red-600" : "text-zinc-900"}`}>
        {value}
      </p>
      <p className={`text-xs mt-0.5 ${highlight ? "text-red-500" : "text-zinc-500"}`}>{label}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 gap-3">
      <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 7a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2Z" />
        </svg>
      </div>
      <p className="text-zinc-900 font-medium">No projects yet</p>
      <p className="text-zinc-500 text-sm max-w-xs">
        Create your first project to start tracking punch items and photos.
      </p>
    </div>
  );
}

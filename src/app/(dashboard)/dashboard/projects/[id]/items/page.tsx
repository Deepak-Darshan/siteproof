import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Project, PunchItem, PunchItemStatus, PunchItemSeverity, PunchItemTrade } from "@/types/database";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// ── Filter option sets ──────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: PunchItemStatus; label: string }[] = [
  { value: "open",      label: "Open" },
  { value: "in_review", label: "In Review" },
  { value: "resolved",  label: "Resolved" },
];

const SEVERITY_OPTIONS: { value: PunchItemSeverity; label: string }[] = [
  { value: "critical", label: "Critical" },
  { value: "major",    label: "Major" },
  { value: "minor",    label: "Minor" },
];

const TRADE_OPTIONS: { value: PunchItemTrade; label: string }[] = [
  { value: "electrical", label: "Electrical" },
  { value: "plumbing",   label: "Plumbing" },
  { value: "carpentry",  label: "Carpentry" },
  { value: "painting",   label: "Painting" },
  { value: "tiling",     label: "Tiling" },
  { value: "hvac",       label: "HVAC" },
  { value: "structural", label: "Structural" },
  { value: "other",      label: "Other" },
];

// ── Badge styles ────────────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<PunchItemSeverity, { bg: string; text: string }> = {
  critical: { bg: "bg-red-100",    text: "text-red-700" },
  major:    { bg: "bg-amber-100",  text: "text-amber-700" },
  minor:    { bg: "bg-blue-100",   text: "text-blue-700" },
};

const STATUS_STYLES: Record<PunchItemStatus, { bg: string; text: string }> = {
  open:      { bg: "bg-zinc-100",  text: "text-zinc-600" },
  in_review: { bg: "bg-amber-100", text: "text-amber-700" },
  resolved:  { bg: "bg-green-100", text: "text-green-700" },
};

const STATUS_LABELS: Record<PunchItemStatus, string> = {
  open:      "Open",
  in_review: "In Review",
  resolved:  "Resolved",
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function buildHref(
  projectId: string,
  params: { status?: string; severity?: string; trade?: string }
) {
  const sp = new URLSearchParams();
  if (params.status)   sp.set("status",   params.status);
  if (params.severity) sp.set("severity", params.severity);
  if (params.trade)    sp.set("trade",    params.trade);
  const qs = sp.toString();
  return `/dashboard/projects/${projectId}/items${qs ? `?${qs}` : ""}`;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function PunchListPage({ params, searchParams }: Props) {
  const { id: projectId } = await params;
  const sp = await searchParams;

  const filterStatus   = typeof sp.status   === "string" ? sp.status   as PunchItemStatus   : undefined;
  const filterSeverity = typeof sp.severity === "string" ? sp.severity as PunchItemSeverity : undefined;
  const filterTrade    = typeof sp.trade    === "string" ? sp.trade    as PunchItemTrade    : undefined;

  const supabase = await createClient();

  // Verify project access (RLS handles it; just check it exists).
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, name")
    .eq("id", projectId)
    .single();

  if (projectError || !project) notFound();
  const p = project as Pick<Project, "id" | "name">;

  // Build filtered query.
  let query = supabase
    .from("punch_items")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (filterStatus)   query = query.eq("status",   filterStatus);
  if (filterSeverity) query = query.eq("severity", filterSeverity);
  if (filterTrade)    query = query.eq("trade",    filterTrade);

  const { data: itemsData } = await query;
  const items = (itemsData as PunchItem[]) ?? [];

  return (
    <main className="max-w-2xl mx-auto px-4 pt-6 pb-24 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/dashboard/projects/${projectId}`}
          className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-zinc-100 transition-colors text-zinc-600 shrink-0"
          aria-label="Back to project"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <div className="min-w-0">
          <h1 className="font-bold text-zinc-900 text-xl">Punch List</h1>
          <p className="text-sm text-zinc-500 truncate">{p.name}</p>
        </div>
      </div>

      {/* Filter chips */}
      <div className="space-y-2">
        {/* Status row */}
        <div className="flex gap-1.5 flex-wrap">
          <FilterChip
            label="All statuses"
            active={!filterStatus}
            href={buildHref(projectId, { severity: filterSeverity, trade: filterTrade })}
          />
          {STATUS_OPTIONS.map((opt) => (
            <FilterChip
              key={opt.value}
              label={opt.label}
              active={filterStatus === opt.value}
              href={buildHref(projectId, { status: filterStatus === opt.value ? undefined : opt.value, severity: filterSeverity, trade: filterTrade })}
            />
          ))}
        </div>

        {/* Severity row */}
        <div className="flex gap-1.5 flex-wrap">
          <FilterChip
            label="All severities"
            active={!filterSeverity}
            href={buildHref(projectId, { status: filterStatus, trade: filterTrade })}
          />
          {SEVERITY_OPTIONS.map((opt) => (
            <FilterChip
              key={opt.value}
              label={opt.label}
              active={filterSeverity === opt.value}
              href={buildHref(projectId, { status: filterStatus, severity: filterSeverity === opt.value ? undefined : opt.value, trade: filterTrade })}
            />
          ))}
        </div>

        {/* Trade row */}
        <div className="flex gap-1.5 flex-wrap">
          <FilterChip
            label="All trades"
            active={!filterTrade}
            href={buildHref(projectId, { status: filterStatus, severity: filterSeverity })}
          />
          {TRADE_OPTIONS.map((opt) => (
            <FilterChip
              key={opt.value}
              label={opt.label}
              active={filterTrade === opt.value}
              href={buildHref(projectId, { status: filterStatus, severity: filterSeverity, trade: filterTrade === opt.value ? undefined : opt.value })}
            />
          ))}
        </div>
      </div>

      {/* Count */}
      <p className="text-xs text-zinc-400">
        {items.length} {items.length === 1 ? "item" : "items"}
        {(filterStatus || filterSeverity || filterTrade) && " matching filters"}
      </p>

      {/* List */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-16 gap-3 bg-white rounded-xl border border-zinc-200">
          <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-400">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          </div>
          <p className="text-zinc-900 font-medium text-sm">No items found</p>
          <p className="text-zinc-500 text-xs">
            {filterStatus || filterSeverity || filterTrade
              ? "Try clearing some filters."
              : "Tap the blueprint to add the first punch item."}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/dashboard/projects/${projectId}/items/${item.id}`}
                className="flex items-start gap-3 bg-white rounded-xl border border-zinc-200 px-4 py-3.5 hover:border-zinc-300 hover:shadow-sm transition-all active:bg-zinc-50"
              >
                {/* Severity dot */}
                <div
                  className="mt-1 w-2.5 h-2.5 rounded-full shrink-0"
                  style={{
                    backgroundColor:
                      item.severity === "critical" ? "#ef4444" :
                      item.severity === "major"    ? "#f97316" : "#3b82f6",
                  }}
                  aria-hidden="true"
                />

                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="font-medium text-zinc-900 text-sm leading-snug">{item.title}</p>

                  <div className="flex flex-wrap gap-1.5">
                    {/* Severity badge */}
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${SEVERITY_STYLES[item.severity].bg} ${SEVERITY_STYLES[item.severity].text}`}>
                      {SEVERITY_OPTIONS.find((o) => o.value === item.severity)?.label ?? item.severity}
                    </span>

                    {/* Status badge */}
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[item.status].bg} ${STATUS_STYLES[item.status].text}`}>
                      {STATUS_LABELS[item.status]}
                    </span>

                    {/* Trade badge */}
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-600">
                      {TRADE_OPTIONS.find((o) => o.value === item.trade)?.label ?? item.trade}
                    </span>
                  </div>
                </div>

                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-300 shrink-0 mt-1" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

// ── FilterChip ────────────────────────────────────────────────────────────────

function FilterChip({ label, active, href }: { label: string; active: boolean; href: string }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
        active
          ? "bg-zinc-900 text-white"
          : "bg-white text-zinc-600 border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
      }`}
    >
      {label}
    </Link>
  );
}

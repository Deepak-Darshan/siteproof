"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { fetchActivity, type ActivityEntry } from "@/app/actions/activity";

// ── Helpers ─────────────────────────────────────────────────────────────────────

/** Returns "Today", "Yesterday", or a formatted date like "5 September 2026". */
function dayLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
}

/** ISO date string (YYYY-MM-DD) used as a grouping key. */
function dayKey(dateStr: string): string {
  return new Date(dateStr).toISOString().slice(0, 10);
}

function timeLabel(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  // For older entries show the clock time since the day header handles the date.
  return new Date(dateStr).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });
}

// ── Action description ──────────────────────────────────────────────────────────

type ActionInfo = {
  dot: string;         // Tailwind bg class for the dot
  sentence: (name: string, itemEl: React.ReactNode) => React.ReactNode;
};

function actionInfo(entry: ActivityEntry): ActionInfo {
  const meta = entry.metadata ?? {};

  switch (entry.action) {
    case "item_created":
      return {
        dot: "bg-zinc-400",
        sentence: (name, itemEl) => (
          <><span className="font-semibold text-zinc-900">{name}</span> created {itemEl}</>
        ),
      };
    case "photo_added":
      return {
        dot: "bg-blue-400",
        sentence: (name, itemEl) =>
          meta.type === "after" ? (
            <><span className="font-semibold text-zinc-900">{name}</span> uploaded the after photo for {itemEl}</>
          ) : (
            <><span className="font-semibold text-zinc-900">{name}</span> uploaded a before photo for {itemEl}</>
          ),
      };
    case "item_resolved":
      return {
        dot: "bg-green-500",
        sentence: (name, itemEl) => (
          <><span className="font-semibold text-zinc-900">{name}</span> marked {itemEl} as resolved</>
        ),
      };
    case "item_reopened":
      return {
        dot: "bg-amber-400",
        sentence: (name, itemEl) => (
          <><span className="font-semibold text-zinc-900">{name}</span> reopened {itemEl}</>
        ),
      };
    case "status_changed":
      return {
        dot: "bg-amber-400",
        sentence: (name, itemEl) =>
          meta.new_status === "in_review" ? (
            <><span className="font-semibold text-zinc-900">{name}</span> submitted {itemEl} for review</>
          ) : (
            <><span className="font-semibold text-zinc-900">{name}</span> changed the status of {itemEl}</>
          ),
      };
    default:
      return {
        dot: "bg-zinc-300",
        sentence: (name, itemEl) => (
          <><span className="font-semibold text-zinc-900">{name}</span> updated {itemEl}</>
        ),
      };
  }
}

// ── Entry row ───────────────────────────────────────────────────────────────────

function EntryRow({ entry, isLast }: { entry: ActivityEntry; isLast: boolean }) {
  const { dot, sentence } = actionInfo(entry);
  const name = entry.profiles?.full_name ?? "Someone";
  const item = entry.punch_items;

  const itemEl = item ? (
    <Link
      href={`/dashboard/projects/${entry.project_id}/items/${item.id}`}
      className="font-semibold text-zinc-900 underline underline-offset-2 decoration-zinc-300 hover:decoration-zinc-600 transition-colors"
    >
      {item.title}
    </Link>
  ) : (
    <span className="italic text-zinc-400">a deleted item</span>
  );

  return (
    <li className="flex gap-3 px-4 py-3">
      {/* Dot + spine */}
      <div className="flex flex-col items-center shrink-0 pt-0.5">
        <div className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
        {!isLast && <div className="w-px flex-1 bg-zinc-100 mt-2" />}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0 flex items-start justify-between gap-4">
        <p className="text-sm text-zinc-600 leading-snug">
          {sentence(name, itemEl)}
        </p>
        <span className="text-xs text-zinc-400 shrink-0 mt-0.5 tabular-nums">
          {timeLabel(entry.created_at)}
        </span>
      </div>
    </li>
  );
}

// ── Day group ───────────────────────────────────────────────────────────────────

function DayGroup({ label, entries }: { label: string; entries: ActivityEntry[] }) {
  return (
    <section className="mb-4">
      {/* Date header */}
      <div className="flex items-center gap-3 mb-1 px-1">
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
          {label}
        </span>
        <div className="flex-1 h-px bg-zinc-200" />
      </div>

      {/* Card */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <ol>
          {entries.map((entry, i) => (
            <EntryRow
              key={entry.id}
              entry={entry}
              isLast={i === entries.length - 1}
            />
          ))}
        </ol>
      </div>
    </section>
  );
}

// ── Grouping logic ──────────────────────────────────────────────────────────────

type Group = { key: string; label: string; entries: ActivityEntry[] };

function groupByDay(entries: ActivityEntry[]): Group[] {
  const map = new Map<string, Group>();
  for (const entry of entries) {
    const key = dayKey(entry.created_at);
    if (!map.has(key)) {
      map.set(key, { key, label: dayLabel(entry.created_at), entries: [] });
    }
    map.get(key)!.entries.push(entry);
  }
  return Array.from(map.values());
}

// ── Feed ────────────────────────────────────────────────────────────────────────

type Props = {
  initialEntries: ActivityEntry[];
  initialHasMore: boolean;
};

export function ActivityFeed({ initialEntries, initialHasMore }: Props) {
  const [entries, setEntries] = useState<ActivityEntry[]>(initialEntries);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function loadMore() {
    setError(null);
    startTransition(async () => {
      const result = await fetchActivity(entries.length);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setEntries((prev) => [...prev, ...result.entries]);
      setHasMore(result.hasMore);
    });
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16 gap-2">
        <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-400">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        </div>
        <p className="text-sm font-medium text-zinc-700">No activity yet</p>
        <p className="text-xs text-zinc-400">Actions on punch items will appear here.</p>
      </div>
    );
  }

  const groups = groupByDay(entries);

  return (
    <div>
      {groups.map((group) => (
        <DayGroup key={group.key} label={group.label} entries={group.entries} />
      ))}

      {error && (
        <p className="text-sm text-red-600 mt-2 text-center">{error}</p>
      )}

      {hasMore && (
        <div className="flex justify-center mt-2 pb-4">
          <button
            type="button"
            onClick={loadMore}
            disabled={isPending}
            className="h-9 px-5 rounded-lg border border-zinc-300 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-50"
          >
            {isPending ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}

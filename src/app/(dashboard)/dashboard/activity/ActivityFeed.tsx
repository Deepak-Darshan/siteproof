"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { fetchActivity, type ActivityEntry } from "@/app/actions/activity";

// ── Action metadata ─────────────────────────────────────────────────────────────

function actionMeta(entry: ActivityEntry): { dot: string; verb: string } {
  const meta = entry.metadata ?? {};
  switch (entry.action) {
    case "item_created":
      return { dot: "bg-zinc-400", verb: "created" };
    case "photo_added":
      return {
        dot: "bg-blue-400",
        verb:
          meta.type === "after"
            ? "uploaded the after photo for"
            : "uploaded the before photo for",
      };
    case "item_resolved":
      return { dot: "bg-green-500", verb: "resolved" };
    case "item_reopened":
      return { dot: "bg-amber-400", verb: "reopened" };
    case "status_changed":
      return {
        dot: "bg-amber-400",
        verb:
          meta.new_status === "in_review"
            ? "submitted for review"
            : `changed status of`,
      };
    default:
      return { dot: "bg-zinc-300", verb: entry.action };
  }
}

// ── Relative time ───────────────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ── Entry row ───────────────────────────────────────────────────────────────────

function EntryRow({ entry, isLast }: { entry: ActivityEntry; isLast: boolean }) {
  const { dot, verb } = actionMeta(entry);
  const name = entry.profiles?.full_name ?? "Someone";
  const item = entry.punch_items;

  return (
    <li className="flex gap-3">
      {/* Timeline spine */}
      <div className="flex flex-col items-center shrink-0">
        <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${dot}`} />
        {!isLast && <div className="w-px flex-1 bg-zinc-200 my-1" />}
      </div>

      {/* Content */}
      <div className="pb-4 min-w-0 flex-1">
        <p className="text-sm text-zinc-700 leading-snug">
          <span className="font-medium text-zinc-900">{name}</span>{" "}
          {verb}{" "}
          {item ? (
            <Link
              href={`/dashboard/projects/${entry.project_id}/items/${item.id}`}
              className="font-medium text-zinc-900 underline underline-offset-2 hover:text-zinc-600 transition-colors"
            >
              {item.title}
            </Link>
          ) : (
            <span className="text-zinc-500 italic">a deleted item</span>
          )}
        </p>
        <p className="text-xs text-zinc-400 mt-0.5">{relativeTime(entry.created_at)}</p>
      </div>
    </li>
  );
}

// ── Feed component ──────────────────────────────────────────────────────────────

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

  return (
    <div>
      <ol className="space-y-0">
        {entries.map((entry, i) => (
          <EntryRow
            key={entry.id}
            entry={entry}
            isLast={i === entries.length - 1 && !hasMore}
          />
        ))}
      </ol>

      {error && (
        <p className="text-sm text-red-600 mt-4 text-center">{error}</p>
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

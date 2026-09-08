"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateDueDate } from "@/app/actions/punch-items";

type Props = {
  itemId: string;
  projectId: string;
  dueDate: string | null;
  isResolved: boolean;
};

function isOverdue(dueDate: string | null, isResolved: boolean): boolean {
  if (!dueDate || isResolved) return false;
  return dueDate < new Date().toISOString().slice(0, 10);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function DueDateSection({ itemId, projectId, dueDate, isResolved }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(dueDate ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const overdue = isOverdue(dueDate, isResolved);

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateDueDate(itemId, projectId, value || null);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  function handleClear() {
    setError(null);
    startTransition(async () => {
      const result = await updateDueDate(itemId, projectId, null);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setValue("");
      setEditing(false);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <div className="space-y-2">
        <input
          type="date"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full h-10 rounded-lg border border-zinc-300 px-3 text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
          autoFocus
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="h-9 px-4 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Save"}
          </button>
          {dueDate && (
            <button
              type="button"
              onClick={handleClear}
              disabled={isPending}
              className="h-9 px-4 rounded-lg border border-zinc-300 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors disabled:opacity-50"
            >
              Remove
            </button>
          )}
          <button
            type="button"
            onClick={() => { setEditing(false); setValue(dueDate ?? ""); setError(null); }}
            disabled={isPending}
            className="h-9 px-4 rounded-lg border border-zinc-300 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {dueDate ? (
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${overdue ? "text-red-600" : "text-zinc-700"}`}>
            {formatDate(dueDate)}
          </span>
          {overdue && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
              Overdue
            </span>
          )}
        </div>
      ) : (
        <span className="text-sm text-zinc-400">No due date</span>
      )}
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-xs text-zinc-400 hover:text-zinc-600 underline underline-offset-2 transition-colors"
      >
        {dueDate ? "Edit" : "Set date"}
      </button>
    </div>
  );
}

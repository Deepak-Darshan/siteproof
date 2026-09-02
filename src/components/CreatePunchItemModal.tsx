"use client";

import { useActionState, useEffect, useRef } from "react";
import { createPunchItem, type CreatePunchItemState } from "@/app/actions/punch-items";
import type { PunchItem, PunchItemSeverity, PunchItemTrade } from "@/types/database";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (item: PunchItem) => void;
  blueprintId: string;
  projectId: string;
  pinX: number;
  pinY: number;
};

const SEVERITY_OPTIONS: { value: PunchItemSeverity; label: string; color: string }[] = [
  { value: "critical", label: "Critical", color: "text-red-600 border-red-400 bg-red-50" },
  { value: "major",    label: "Major",    color: "text-amber-600 border-amber-400 bg-amber-50" },
  { value: "minor",    label: "Minor",    color: "text-blue-600 border-blue-400 bg-blue-50" },
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

export function CreatePunchItemModal({
  isOpen,
  onClose,
  onCreated,
  blueprintId,
  projectId,
  pinX,
  pinY,
}: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const onCreatedRef = useRef(onCreated);
  useEffect(() => { onCreatedRef.current = onCreated; });

  const [state, action, pending] = useActionState<CreatePunchItemState, FormData>(
    createPunchItem,
    undefined
  );

  useEffect(() => {
    if (state && "success" in state && state.success) {
      onCreatedRef.current(state.item);
    }
  }, [state]);

  useEffect(() => {
    if (isOpen) formRef.current?.reset();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="punch-modal-title"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />

      {/* Panel */}
      <div className="relative w-full sm:max-w-md bg-white sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[90dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 shrink-0">
          <h2 id="punch-modal-title" className="text-lg font-semibold text-zinc-900">
            New punch item
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-full text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Scrollable form body */}
        <form ref={formRef} action={action} className="overflow-y-auto flex-1 px-5 pb-5 space-y-4">
          {/* Hidden fields */}
          <input type="hidden" name="project_id"   value={projectId} />
          <input type="hidden" name="blueprint_id" value={blueprintId} />
          <input type="hidden" name="pin_x"        value={pinX.toString()} />
          <input type="hidden" name="pin_y"        value={pinY.toString()} />

          {/* Title */}
          <div>
            <label htmlFor="item-title" className="block text-sm font-medium text-zinc-700 mb-1.5">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="item-title"
              name="title"
              type="text"
              required
              autoFocus
              placeholder="e.g. Cracked tile near entry"
              className="w-full h-11 rounded-lg border border-zinc-300 px-3 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent text-base"
            />
            {state && "errors" in state && state.errors?.title && (
              <p className="mt-1.5 text-sm text-red-600">{state.errors.title[0]}</p>
            )}
          </div>

          {/* Severity segmented control */}
          <div>
            <p className="block text-sm font-medium text-zinc-700 mb-1.5">Severity</p>
            <div className="grid grid-cols-3 gap-2" role="radiogroup">
              {SEVERITY_OPTIONS.map(({ value, label, color }) => (
                <label key={value} className="cursor-pointer">
                  <input type="radio" name="severity" value={value} defaultChecked={value === "major"} className="sr-only peer" />
                  <span className={`flex items-center justify-center h-11 rounded-lg border-2 text-sm font-medium transition-all peer-checked:ring-2 peer-checked:ring-offset-1 ${color} border-transparent bg-zinc-100 text-zinc-600 peer-checked:border-current peer-checked:bg-current peer-checked:bg-opacity-10`}>
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Trade */}
          <div>
            <label htmlFor="item-trade" className="block text-sm font-medium text-zinc-700 mb-1.5">
              Trade
            </label>
            <select
              id="item-trade"
              name="trade"
              defaultValue="other"
              className="w-full h-11 rounded-lg border border-zinc-300 px-3 text-zinc-900 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 text-base"
            >
              {TRADE_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="item-desc" className="block text-sm font-medium text-zinc-700 mb-1.5">
              Description <span className="text-zinc-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="item-desc"
              name="description"
              rows={3}
              placeholder="Additional notes about the defect…"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent text-base resize-none"
            />
          </div>

          {/* Server error */}
          {state && "message" in state && state.message && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{state.message}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-lg border border-zinc-300 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="flex-1 h-11 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {pending ? "Saving…" : "Create item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

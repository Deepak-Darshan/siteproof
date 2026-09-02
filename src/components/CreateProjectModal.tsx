"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createProject } from "@/app/actions/projects";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export function CreateProjectModal({ isOpen, onClose }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(createProject, undefined);

  useEffect(() => {
    if (state && "success" in state && state.success) {
      onClose();
      router.refresh();
    }
  }, [state, onClose, router]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      formRef.current?.reset();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative w-full sm:max-w-md bg-white sm:rounded-2xl rounded-t-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 id="modal-title" className="text-lg font-semibold text-zinc-900">
            New project
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-full text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
            aria-label="Close"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form ref={formRef} action={action} className="space-y-4">
          <div>
            <label
              htmlFor="proj-name"
              className="block text-sm font-medium text-zinc-700 mb-1.5"
            >
              Project name <span className="text-red-500">*</span>
            </label>
            <input
              id="proj-name"
              name="name"
              type="text"
              required
              autoFocus
              className="w-full h-11 rounded-lg border border-zinc-300 px-3 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent text-base"
              placeholder="e.g. 42 Harbour St Fitout"
            />
            {state && "errors" in state && state.errors?.name && (
              <p className="mt-1.5 text-sm text-red-600">
                {state.errors.name[0]}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="proj-address"
              className="block text-sm font-medium text-zinc-700 mb-1.5"
            >
              Site address{" "}
              <span className="text-zinc-400 font-normal">(optional)</span>
            </label>
            <input
              id="proj-address"
              name="address"
              type="text"
              className="w-full h-11 rounded-lg border border-zinc-300 px-3 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent text-base"
              placeholder="123 Main St, Sydney NSW"
            />
          </div>

          {state && "message" in state && state.message && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {state.message}
            </p>
          )}

          <div className="flex gap-3 pt-2">
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
              {pending ? "Creating…" : "Create project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

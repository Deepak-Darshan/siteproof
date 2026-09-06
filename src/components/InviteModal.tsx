"use client";

import { useState, useRef } from "react";
import { createInvite } from "@/app/actions/invites";

type Props = {
  projectId: string;
  onClose: () => void;
  onInvited: (inviteLink: string) => void;
};

export function InviteModal({ projectId, onClose, onInvited }: Props) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await createInvite(projectId, email.trim(), role);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      const link = `${window.location.origin}/invite/${result.invite.token}`;
      onInvited(link);
    } finally {
      setLoading(false);
    }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4 sm:pb-0"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-zinc-100">
          <h2 className="font-semibold text-zinc-900 text-base">Invite team member</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 text-zinc-500 transition-colors"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Email */}
          <div>
            <label htmlFor="invite-email" className="block text-sm font-medium text-zinc-700 mb-1.5">
              Email address
            </label>
            <input
              ref={inputRef}
              id="invite-email"
              type="email"
              required
              autoComplete="email"
              placeholder="tradie@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-zinc-300 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
            />
          </div>

          {/* Role */}
          <div>
            <p className="text-sm font-medium text-zinc-700 mb-1.5">Role</p>
            <div className="flex gap-2">
              {(["member", "admin"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`flex-1 h-9 rounded-lg border text-sm font-medium transition-colors ${
                    role === r
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-300 text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  {r === "member" ? "Member" : "Admin"}
                </button>
              ))}
            </div>
            <p className="text-xs text-zinc-400 mt-1.5">
              {role === "admin"
                ? "Admins can invite others and accept/reject items."
                : "Members can create and resolve punch items."}
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50"
          >
            {loading ? "Sending…" : "Generate invite link"}
          </button>
        </form>
      </div>
    </div>
  );
}

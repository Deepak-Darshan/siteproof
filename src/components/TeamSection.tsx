"use client";

import { useState } from "react";
import { InviteModal } from "./InviteModal";
import type { ProjectMember, Profile } from "@/types/database";

type MemberWithProfile = ProjectMember & { profiles: Pick<Profile, "full_name" | "company"> };

type Props = {
  projectId: string;
  members: MemberWithProfile[];
  isAdmin: boolean;
};

export function TeamSection({ projectId, members, isAdmin }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function handleInvited(link: string) {
    setShowModal(false);
    setInviteLink(link);
  }

  async function copyLink() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">
          Team
        </h2>
        {isAdmin && (
          <button
            type="button"
            onClick={() => { setShowModal(true); setInviteLink(null); }}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-zinc-300 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
            Invite
          </button>
        )}
      </div>

      {/* Invite link banner */}
      {inviteLink && (
        <div className="mb-3 rounded-xl border border-zinc-200 bg-white p-3 space-y-2">
          <p className="text-xs font-medium text-zinc-700">Share this invite link (expires in 7 days):</p>
          <div className="flex gap-2">
            <input
              readOnly
              value={inviteLink}
              className="flex-1 h-9 px-3 rounded-lg border border-zinc-200 bg-zinc-50 text-xs text-zinc-600 truncate focus:outline-none"
            />
            <button
              type="button"
              onClick={copyLink}
              className="h-9 px-3 rounded-lg border border-zinc-300 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors shrink-0"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}

      {/* Member list */}
      <ul className="space-y-2">
        {members.map((m) => (
          <li
            key={m.user_id}
            className="flex items-center gap-3 bg-white rounded-xl border border-zinc-200 px-4 py-3"
          >
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-semibold text-zinc-600 shrink-0 select-none">
              {(m.profiles?.full_name ?? "?").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-900 truncate">
                {m.profiles?.full_name ?? "Unknown"}
              </p>
              {m.profiles?.company && (
                <p className="text-xs text-zinc-400 truncate">{m.profiles.company}</p>
              )}
            </div>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                m.role === "admin"
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-100 text-zinc-600"
              }`}
            >
              {m.role === "admin" ? "Admin" : "Member"}
            </span>
          </li>
        ))}
      </ul>

      {showModal && (
        <InviteModal
          projectId={projectId}
          onClose={() => setShowModal(false)}
          onInvited={handleInvited}
        />
      )}
    </section>
  );
}

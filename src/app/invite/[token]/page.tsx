import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { acceptInvite } from "@/app/actions/invites";
import type { ProjectInvite } from "@/types/database";

type Props = {
  params: Promise<{ token: string }>;
};

export default async function InviteAcceptPage({ params }: Props) {
  const { token } = await params;
  const supabase = await createClient();

  // Look up invite to show project name before the user decides to accept.
  const { data: inviteData } = await supabase
    .from("project_invites")
    .select("id, email, role, expires_at, accepted_at, projects(name)")
    .eq("token", token)
    .maybeSingle();

  // Invalid token.
  if (!inviteData) {
    return <ErrorPage message="This invite link is invalid or has already been used." />;
  }

  const invite = inviteData as unknown as ProjectInvite & {
    projects: { name: string } | null;
  };

  if (invite.accepted_at) {
    return <ErrorPage message="This invite has already been accepted." />;
  }

  if (new Date(invite.expires_at) < new Date()) {
    return <ErrorPage message="This invite link has expired. Ask the project admin to send a new one." />;
  }

  // Check if user is authenticated.
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Redirect to login, then back to this page.
    redirect(`/login?redirect=/invite/${token}`);
  }

  // Accept the invite automatically on page load (server action inline).
  const result = await acceptInvite(token);

  if ("error" in result) {
    return <ErrorPage message={result.error} />;
  }

  // Redirect to the newly joined project.
  redirect(`/dashboard/projects/${result.projectId}`);
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ErrorPage({ message }: { message: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mx-auto text-red-500">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h1 className="font-bold text-zinc-900 text-lg">Invite unavailable</h1>
        <p className="text-sm text-zinc-500">{message}</p>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center h-10 px-5 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition-colors"
        >
          Go to dashboard
        </Link>
      </div>
    </main>
  );
}

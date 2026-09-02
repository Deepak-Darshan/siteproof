import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/actions/auth";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen bg-zinc-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-zinc-900">SiteProof</h1>
          <form action={logout}>
            <button
              type="submit"
              className="h-11 px-4 rounded-lg border border-zinc-300 text-sm font-medium text-zinc-700 hover:bg-zinc-100 transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
        <p className="text-zinc-500 text-sm">Signed in as {user?.email}</p>
      </div>
    </main>
  );
}

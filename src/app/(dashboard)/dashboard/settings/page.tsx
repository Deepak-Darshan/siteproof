import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/actions/auth";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="max-w-2xl mx-auto px-4 pt-6">
      <h1 className="text-xl font-bold text-zinc-900 mb-6">Settings</h1>

      <div className="bg-white rounded-xl border border-zinc-200 divide-y divide-zinc-100">
        <div className="px-4 py-3">
          <p className="text-xs text-zinc-500 mb-0.5">Signed in as</p>
          <p className="text-sm font-medium text-zinc-900">{user?.email}</p>
        </div>

        <div className="px-4 py-3">
          <form action={logout}>
            <button
              type="submit"
              className="h-10 px-4 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

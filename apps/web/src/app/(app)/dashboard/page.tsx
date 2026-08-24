import Link from "next/link";
import { requireSession } from "@/lib/session";
import { findUserById } from "@pair/db";
import { logout } from "./actions";

export default async function DashboardPage() {
  const session = await requireSession();
  const user = await findUserById(session.userId);
  if (!user) {
    await logout();
    return;
  }

  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm space-y-8 text-center">
        <p className="font-mono text-sm text-ink">{user.email}</p>

        <Link
          href="/settings/garmin"
          className="block w-full border border-ink px-4 py-2.5 text-center text-ink transition-colors hover:bg-ink hover:text-bone"
        >
          Connect Garmin
        </Link>

        <form action={logout}>
          <button
            type="submit"
            className="w-full border border-ink px-4 py-2.5 text-ink transition-colors hover:bg-ink hover:text-bone"
          >
            Log out
          </button>
        </form>
      </div>
    </main>
  );
}

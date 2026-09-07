import { requireSession } from "@/lib/session";
import { findUserById } from "@pair/db";
import { requireGarminConnection } from "@/lib/garmin-status";
import { logout } from "./actions";
import { AppShell } from "./_components/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const user = await findUserById(session.userId);
  if (!user) {
    await logout();
    return;
  }

  const garminStatus = await requireGarminConnection();

  return (
    <AppShell email={user.email} garminStatus={garminStatus}>
      {children}
    </AppShell>
  );
}

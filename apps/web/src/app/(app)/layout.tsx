import { requireSession } from "@/lib/session";
import { findUserById, findCredentialsByUserId } from "@pair/db";
import { deriveGarminStatus } from "@/lib/garmin-status";
import { logout } from "./actions";
import { AppShell } from "./_components/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const user = await findUserById(session.userId);
  if (!user) {
    await logout();
    return;
  }

  const credentials = await findCredentialsByUserId(session.userId);
  const garminStatus = deriveGarminStatus(credentials);

  return (
    <AppShell email={user.email} garminStatus={garminStatus}>
      {children}
    </AppShell>
  );
}

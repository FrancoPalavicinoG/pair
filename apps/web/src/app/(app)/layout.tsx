import { requireSession } from "@/lib/session";
import { findUserById } from "@pair/db";
import { logout } from "./actions";
import { AppShell } from "./_components/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const user = await findUserById(session.userId);
  if (!user) {
    await logout();
    return;
  }

  return <AppShell email={user.email}>{children}</AppShell>;
}

import { redirect } from "next/navigation";
import { findCredentialsByUserId } from "@pair/db";
import { requireSession } from "./session";

export type GarminStatus =
  | { state: "not_connected" }
  | { state: "needs_reconnect" }
  | { state: "syncing" }
  | { state: "synced"; lastSyncedAt: Date | null };

type Credentials = Awaited<ReturnType<typeof findCredentialsByUserId>>;

// Usado por (app)/layout.tsx (CTA del sidebar) y dashboard/page.tsx (estado junto al título) —
// misma derivación en los dos lugares, vive acá una sola vez.
export function deriveGarminStatus(credentials: Credentials): GarminStatus {
  if (!credentials) {
    return { state: "not_connected" };
  }
  if (credentials.syncInProgress) {
    return { state: "syncing" };
  }
  if (credentials.status !== "active") {
    return { state: "needs_reconnect" };
  }
  return { state: "synced", lastSyncedAt: credentials.lastSyncedAt };
}

// Gate de conexión Garmin, mismo patrón que requireSession(). Ver docs/specs/app-connections.md.
export async function requireGarminConnection(): Promise<GarminStatus> {
  const session = await requireSession();
  const credentials = await findCredentialsByUserId(session.userId);
  const status = deriveGarminStatus(credentials);

  if (status.state === "not_connected" || status.state === "needs_reconnect") {
    redirect("/settings/garmin");
  }

  return status;
}

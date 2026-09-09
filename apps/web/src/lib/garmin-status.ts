import { redirect } from "next/navigation";
import { findCredentialsByUserId, deriveGarminStatus, type GarminStatus } from "@pair/db";
import { requireSession } from "./session";

export type { GarminStatus };

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

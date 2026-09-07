import { requireSession } from "@/lib/session";

// Sin AppShell a propósito: esta es la vista de gate de Garmin (ver docs/specs/app-connections.md),
// mismo tratamiento sin sidebar que (auth). Requiere sesión de PAIR, no requiere Garmin conectado
// (sería la propia página a la que este grupo manda).
export default async function GarminConnectLayout({ children }: { children: React.ReactNode }) {
  await requireSession();
  return children;
}

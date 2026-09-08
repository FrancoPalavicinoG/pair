import { requireSession } from "@/lib/session";

// Sin AppShell a proposito, mismo tratamiento que (garmin-connect): requiere
// sesion de PAIR, no pasa por el gate de conexion Garmin.
export default async function OAuthConsentLayout({ children }: { children: React.ReactNode }) {
  await requireSession();
  return children;
}

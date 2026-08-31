import { Wordmark } from "@/components/wordmark";
import { PairButton } from "@/components/pair-button";
import type { GarminStatus } from "@/lib/garmin-status";
import { logout, syncNowAction } from "../actions";
import { NavLink } from "./nav-link";
import { SyncStatusPoller } from "./sync-status-poller";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/activities", label: "Activities" },
  { href: "/settings/garmin", label: "Connect Garmin" },
  { href: "/dashboard/widgets", label: "Widgets" },
];

// Shell de escritorio: sidebar fijo + contenido a la derecha (docs/style.md).
export function AppShell({
  email,
  garminStatus,
  children,
}: {
  email: string;
  garminStatus: GarminStatus;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-1">
      <aside className="flex w-[248px] shrink-0 flex-col border-r border-rule-soft py-6">
        <div className="px-6 pb-8">
          <Wordmark />
        </div>

        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} href={item.href}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto space-y-4 px-6 pt-8">
          <GarminStatusBlock status={garminStatus} />

          <div className="space-y-3">
            <p className="truncate font-mono text-xs text-graphite">{email}</p>
            <form action={logout}>
              <button
                type="submit"
                className="font-mono text-xs uppercase tracking-[0.1em] text-graphite transition-colors hover:text-ink"
              >
                Log out
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main className="flex-1 px-12 py-10">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}

// Estado de conexión de Garmin: visible desde cualquier ruta, no solo /dashboard. Connect/
// Reconnect y Sync now son botones ember de ancho completo (proporcionales al sidebar, no
// shrink-wrapped) — es la acción accionable de este bloque. "Synced [hora]" (texto, sin
// botón) vive debajo del título "Widgets" en /dashboard en vez de acá — ver dashboard/page.tsx.
function GarminStatusBlock({ status }: { status: GarminStatus }) {
  if (status.state === "not_connected" || status.state === "needs_reconnect") {
    return (
      <div className="space-y-2 border-t border-rule-soft pt-4">
        <p className="font-mono text-xs uppercase tracking-[0.1em] text-ember">
          {status.state === "not_connected" ? "Garmin not connected" : "Garmin disconnected"}
        </p>
        <PairButton variant="primary" href="/settings/garmin" className="w-full">
          {status.state === "not_connected" ? "Connect Garmin" : "Reconnect Garmin"}
        </PairButton>
      </div>
    );
  }

  if (status.state === "syncing") {
    return (
      <div className="border-t border-rule-soft pt-4">
        <button
          type="button"
          disabled
          className="inline-flex w-full items-center justify-center bg-panel px-4 py-2.5 text-sm text-bone disabled:cursor-not-allowed"
        >
          Syncing…
        </button>
        <SyncStatusPoller syncInProgress />
      </div>
    );
  }

  return (
    <div className="border-t border-rule-soft pt-4">
      <form action={syncNowAction}>
        <PairButton variant="primary" type="submit" className="w-full">
          Sync now
        </PairButton>
      </form>
    </div>
  );
}

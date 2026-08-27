import { Wordmark } from "@/components/wordmark";
import { logout } from "../actions";
import { NavLink } from "./nav-link";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/settings/garmin", label: "Connect Garmin" },
  { href: "/dashboard/widgets", label: "Widgets" },
];

// Shell de escritorio: sidebar fijo + contenido a la derecha (docs/style.md).
export function AppShell({ email, children }: { email: string; children: React.ReactNode }) {
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

        <div className="mt-auto space-y-3 px-6 pt-8">
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
      </aside>

      <main className="flex-1 px-12 py-10">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}

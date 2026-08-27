"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Item de nav: marcador `›`, pasa a ember en la ruta activa.
export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className="flex items-center gap-2 px-6 py-2 text-sm text-ink outline-none transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-ember focus-visible:-outline-offset-2"
    >
      <span aria-hidden className={active ? "text-ember" : "text-graphite"}>
        ›
      </span>
      {children}
    </Link>
  );
}

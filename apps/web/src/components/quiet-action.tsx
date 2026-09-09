import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

const CLASSES = "font-mono text-xs uppercase tracking-[0.1em] text-graphite transition-colors hover:text-ink";

type CommonProps = { className?: string; children: ReactNode };

type QuietActionProps =
  | (CommonProps & { href: string } & Omit<ComponentPropsWithoutRef<typeof Link>, "href" | "className">)
  | (CommonProps & { href?: undefined } & Omit<ComponentPropsWithoutRef<"button">, "className">);

// Acción secundaria discreta (editar, volver, cerrar sesión): mono chico uppercase,
// graphite -> ink en hover. `href` renderiza <Link>, si no renderiza <button>.
export function QuietAction({ className, children, ...props }: QuietActionProps) {
  const classes = [CLASSES, className].filter(Boolean).join(" ");

  if (props.href !== undefined) {
    const { href, ...linkProps } = props;
    return (
      <Link href={href} className={classes} {...linkProps}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={classes} {...props}>
      {children}
    </button>
  );
}

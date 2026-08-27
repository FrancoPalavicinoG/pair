import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

const CLASSES =
  "flex w-full items-center justify-between gap-3 border border-rule-soft px-3 py-2 text-sm text-ink outline-none transition-colors hover:border-ink focus-visible:[--tw-outline-style:solid] focus-visible:outline-2 focus-visible:outline-ember focus-visible:outline-offset-2";

type CommonProps = { className?: string; children: ReactNode };

type ListRowProps =
  | (CommonProps & { href: string } & Omit<ComponentPropsWithoutRef<typeof Link>, "href" | "className">)
  | (CommonProps & { href?: undefined } & Omit<ComponentPropsWithoutRef<"button">, "className">);

// Fila estándar de lista/menú de docs/style.md: borde rule-soft, hover a ink.
// `href` renderiza <Link>, si no renderiza <button>.
export function ListRow({ className, children, ...props }: ListRowProps) {
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

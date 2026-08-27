import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type Variant = "primary" | "outline" | "confirm";

const BASE =
  "inline-flex items-center justify-center px-4 py-2.5 outline-none focus-visible:[--tw-outline-style:solid] focus-visible:outline-2 focus-visible:outline-ember focus-visible:outline-offset-2 disabled:cursor-not-allowed";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-ember text-bone transition-opacity disabled:opacity-60",
  outline:
    "text-sm border border-ink text-ink transition-colors hover:bg-ink hover:text-bone disabled:opacity-60",
  confirm:
    "bg-ember text-bone transition-colors disabled:border disabled:border-rule-soft disabled:bg-transparent disabled:text-graphite",
};

type CommonProps = { variant?: Variant; className?: string; children: ReactNode };

type PairButtonProps =
  | (CommonProps & { href: string } & Omit<ComponentPropsWithoutRef<typeof Link>, "href" | "className">)
  | (CommonProps & { href?: undefined } & Omit<ComponentPropsWithoutRef<"button">, "className">);

// Botón único del proyecto: variantes primary/outline/confirm de docs/style.md.
// `href` renderiza <Link>, si no renderiza <button>.
export function PairButton({ variant = "primary", className, children, ...props }: PairButtonProps) {
  const classes = [BASE, VARIANT_CLASSES[variant], className].filter(Boolean).join(" ");

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

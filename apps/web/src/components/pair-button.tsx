import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type Variant = "primary" | "outline" | "confirm";

const BASE =
  "inline-flex items-center justify-center px-4 py-2.5 outline-none transition duration-150 ease-out active:duration-0 active:scale-[0.97] focus-visible:[--tw-outline-style:solid] focus-visible:outline-2 focus-visible:outline-ember focus-visible:outline-offset-2 disabled:cursor-not-allowed";

// Hover y press no comparten ningún color a propósito: si press conserva el borde/texto
// ember de hover (solo cambiando el fondo), se percibe como "el hover sigue activo" aunque
// técnicamente sea otra regla — probado esta sesión. Press pasa a bone/ink, igual que el
// hover de Outline (el "pair button negro"): en cuanto se aprieta, cero ember en pantalla.
// `[&:hover:not(:active)]` (no `hover:` plano) hace que hover-sin-press y press sean
// selectores mutuamente excluyentes, sin depender del orden en que Tailwind emite las reglas.
// Clases completas y literales a propósito (nunca armadas con template string / variable):
// Tailwind escanea el código fuente en busca del texto exacto de cada clase, no evalúa JS —
// una clase interpolada no genera ningún CSS (esto rompió el hover, encontrado esta sesión).
const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "border border-transparent bg-ember text-bone [&:hover:not(:active)]:bg-transparent [&:hover:not(:active)]:border-ember [&:hover:not(:active)]:text-ember active:border-ink active:bg-ink active:text-bone disabled:opacity-60",
  outline: "text-sm border border-ink text-ink hover:bg-ink hover:text-bone disabled:opacity-60",
  confirm:
    "border border-transparent bg-ember text-bone [&:hover:not(:active)]:bg-transparent [&:hover:not(:active)]:border-ember [&:hover:not(:active)]:text-ember active:border-ink active:bg-ink active:text-bone disabled:border-rule-soft disabled:bg-transparent disabled:text-graphite",
};

type CommonProps = { variant?: Variant; className?: string; children: ReactNode };

type PairButtonProps =
  | (CommonProps & { href: string } & Omit<
        ComponentPropsWithoutRef<typeof Link>,
        "href" | "className"
      >)
  | (CommonProps & { href?: undefined } & Omit<ComponentPropsWithoutRef<"button">, "className">);

// Botón único del proyecto: variantes primary/outline/confirm de docs/style.md.
// `href` renderiza <Link>, si no renderiza <button>.
export function PairButton({
  variant = "primary",
  className,
  children,
  ...props
}: PairButtonProps) {
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

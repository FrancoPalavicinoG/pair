// Wordmark chico para chrome persistente (sidebar, auth) — sin animacion de entrada.
export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2">
      <svg viewBox="0 0 74 44" width="28" height="17" aria-hidden className="shrink-0 overflow-visible">
        <circle cx="27" cy="22" r="18" fill="none" stroke="var(--ink)" strokeWidth="3.4" />
        <circle cx="47" cy="22" r="18" fill="none" stroke="var(--ember)" strokeWidth="3.4" />
      </svg>
      <span className="font-display text-[22px] leading-none tracking-[-.045em] text-ink">
        p<span className="text-ember">AI</span>r
      </span>
    </span>
  );
}

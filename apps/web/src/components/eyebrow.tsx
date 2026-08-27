// Marcador de seccion: label mono + dos puntos superpuestos (docs/style.md).
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="eyebrow-dots flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.2em] text-graphite">
      {children}
    </p>
  );
}

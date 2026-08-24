"use client";

import { useActionState } from "react";
import { connectGarminAction } from "../actions";

// Un solo formulario para los dos pasos (credenciales, y código MFA si Garmin
// lo pide) — qué campos mostrar depende de state?.status.
export function GarminConnectForm() {
  const [state, formAction, pending] = useActionState(connectGarminAction, undefined);
  const needsMfa = state?.status === "mfa_required";

  return (
    <form action={formAction} className="space-y-4">
      {needsMfa ? (
        <>
          <input type="hidden" name="sessionId" value={state.sessionId} />
          <label className="block space-y-1.5">
            <span className="font-mono text-xs uppercase tracking-[0.1em] text-graphite">
              MFA code
            </span>
            <span className="flex items-center gap-2 border border-bone/20 bg-panel px-3 py-2.5 font-mono text-bone transition-colors focus-within:border-ember">
              <span aria-hidden>$</span>
              <input
                type="text"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-graphite"
              />
            </span>
          </label>
        </>
      ) : (
        <>
          <label className="block space-y-1.5">
            <span className="font-mono text-xs uppercase tracking-[0.1em] text-graphite">
              Garmin email
            </span>
            <span className="flex items-center gap-2 border border-bone/20 bg-panel px-3 py-2.5 font-mono text-bone transition-colors focus-within:border-ember">
              <span aria-hidden>$</span>
              <input
                type="email"
                name="email"
                autoComplete="username"
                required
                className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-graphite"
              />
            </span>
          </label>

          <label className="block space-y-1.5">
            <span className="font-mono text-xs uppercase tracking-[0.1em] text-graphite">
              Garmin password
            </span>
            <span className="flex items-center gap-2 border border-bone/20 bg-panel px-3 py-2.5 font-mono text-bone transition-colors focus-within:border-ember">
              <span aria-hidden>$</span>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                required
                className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-graphite"
              />
            </span>
          </label>
        </>
      )}

      {state?.status === "error" && (
        <p role="alert" className="text-sm text-ink">
          <span aria-hidden>× </span>
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-ember px-4 py-2.5 text-bone outline-none transition-opacity focus-visible:outline-2 focus-visible:outline-ember focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {needsMfa ? "Verify" : "Connect"}
      </button>
    </form>
  );
}

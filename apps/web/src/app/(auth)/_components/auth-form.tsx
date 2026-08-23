"use client";

import { useActionState } from "react";

export type AuthFormState = { error?: string } | undefined;

type AuthFormProps = {
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  submitLabel: string;
  passwordAutoComplete: "current-password" | "new-password";
};

// Formulario compartido entre login y signup: mismos campos (email + password),
// el caller solo cambia el Server Action y el texto del botón.
export function AuthForm({ action, submitLabel, passwordAutoComplete }: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <label className="block space-y-1.5">
        <span className="font-mono text-xs uppercase tracking-[0.1em] text-graphite">Email</span>
        <span className="flex items-center gap-2 border border-bone/20 bg-panel px-3 py-2.5 font-mono text-bone transition-colors focus-within:border-ember">
          <span aria-hidden>$</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-graphite"
          />
        </span>
      </label>

      <label className="block space-y-1.5">
        <span className="font-mono text-xs uppercase tracking-[0.1em] text-graphite">Password</span>
        <span className="flex items-center gap-2 border border-bone/20 bg-panel px-3 py-2.5 font-mono text-bone transition-colors focus-within:border-ember">
          <span aria-hidden>$</span>
          <input
            type="password"
            name="password"
            autoComplete={passwordAutoComplete}
            required
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-graphite"
          />
        </span>
      </label>

      {state?.error && (
        <p role="alert" className="text-sm text-ink">
          <span aria-hidden>× </span>
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-ember px-4 py-2.5 text-bone outline-none transition-opacity focus-visible:outline-2 focus-visible:outline-ember focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitLabel}
      </button>
    </form>
  );
}

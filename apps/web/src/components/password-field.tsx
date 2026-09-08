"use client";

import { useState } from "react";

type PasswordFieldProps = {
  label: string;
  name: string;
  autoComplete: "current-password" | "new-password";
};

// Campo de password compartido entre auth-form y garmin-connect-form: mismo
// wrapper que el resto de los inputs, con toggle de visibilidad (ícono de ojo).
export function PasswordField({ label, name, autoComplete }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="block space-y-1.5">
      <span className="font-mono text-xs uppercase tracking-[0.1em] text-graphite">{label}</span>
      <span className="flex items-center gap-2 border border-bone/20 bg-panel px-3 py-2.5 font-mono text-bone transition-colors focus-within:border-ember">
        <span aria-hidden>$</span>
        <input
          type={visible ? "text" : "password"}
          name={name}
          autoComplete={autoComplete}
          required
          className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-graphite"
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="shrink-0 text-graphite outline-none transition-colors hover:text-bone focus-visible:[--tw-outline-style:solid] focus-visible:outline-2 focus-visible:outline-ember focus-visible:outline-offset-2"
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </span>
    </label>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.5">
      <path
        d="M1.5 10S4.5 4 10 4s8.5 6 8.5 6-3 6-8.5 6-8.5-6-8.5-6Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="10" r="2.25" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.5">
      <path
        d="M1.5 10S4.5 4 10 4s8.5 6 8.5 6-3 6-8.5 6-8.5-6-8.5-6Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="10" r="2.25" />
      <path d="M2.5 2.5l15 15" strokeLinecap="round" />
    </svg>
  );
}

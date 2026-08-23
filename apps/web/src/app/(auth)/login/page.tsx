import Link from "next/link";
import { AuthForm } from "../_components/auth-form";
import { loginAction } from "./actions";

export default function LoginPage() {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm space-y-8">
        <h1 className="font-mono text-xs uppercase tracking-[0.1em] text-graphite">Log in</h1>

        <AuthForm
          action={loginAction}
          submitLabel="Log in"
          passwordAutoComplete="current-password"
        />

        <p className="text-center text-sm text-graphite">
          <Link href="/signup" className="text-ink underline-offset-4 hover:underline">
            No account? Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}

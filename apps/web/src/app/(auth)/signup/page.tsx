import Link from "next/link";
import { AuthForm } from "../_components/auth-form";
import { signupAction } from "./actions";

export default function SignupPage() {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm space-y-8">
        <h1 className="font-mono text-xs uppercase tracking-[0.1em] text-graphite">Sign up</h1>

        <AuthForm
          action={signupAction}
          submitLabel="Sign up"
          passwordAutoComplete="new-password"
        />

        <p className="text-center text-sm text-graphite">
          <Link href="/login" className="text-ink underline-offset-4 hover:underline">
            Already have an account? Log in
          </Link>
        </p>
      </div>
    </main>
  );
}

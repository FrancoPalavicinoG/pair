"use server";

import { redirect } from "next/navigation";
import { logIn } from "@/services/auth-service";
import { createSession } from "@/lib/session";
import type { AuthFormState } from "../_components/auth-form";
import { AuthError } from "@pair/core";

export async function loginAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {

  const email = formData.get("email");
  const password = formData.get("password");
  if (typeof email !== "string" || typeof password !== "string") {
    return { error: "Invalid form data" };
  }

  let user;
  try {
    user = await logIn(email, password);
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: err.message };
    }
    throw err;
  }

  await createSession(user.id);
  redirect("/dashboard");
}

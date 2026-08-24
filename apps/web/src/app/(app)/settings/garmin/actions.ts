"use server";

import { redirect } from "next/navigation";
import { performLogin, performMfa, saveCredentials } from "@pair/sync";
import { requireSession } from "@/lib/session";
import { GarminApiError } from "@pair/core";

export type GarminConnectState =
  | undefined
  | { status: "mfa_required"; sessionId: string }
  | { status: "error"; message: string };

export async function connectGarminAction(
  _prevState: GarminConnectState,
  formData: FormData,
): Promise<GarminConnectState> {
  const session = await requireSession();
  const sessionId = formData.get("sessionId");
  if (typeof sessionId === "string" && sessionId) {
    // Paso MFA
    const code = formData.get("code");
    if (typeof code !== "string" || !code) {
      return { status: "error", message: "Invalid form data" };
    } 
    let creds;
    try {
      creds = await performMfa(sessionId, code);
    } catch (err) {
      if (err instanceof GarminApiError) {
        return { status: "error", message: err.message };
      }
      throw err;
    }
    await saveCredentials(session.userId, creds, "active");
    redirect("/dashboard");
  } else {
    // Paso credenciales
    const email = formData.get("email");
    const password = formData.get("password");
    if (typeof email !== "string" || typeof password !== "string") {
      return { status: "error", message: "Invalid form data" };
    }
    let result;
    try {
      result = await performLogin(email, password);
    } catch (err) {
      if (err instanceof GarminApiError) {
        return { status: "error", message: err.message };
      }
      throw err;
    }
    if (result.status === "mfa_required") {
      return { status: "mfa_required", sessionId: result.sessionId };
    } 
    await saveCredentials(session.userId, result.creds, "active");
    redirect("/dashboard");

  }
}

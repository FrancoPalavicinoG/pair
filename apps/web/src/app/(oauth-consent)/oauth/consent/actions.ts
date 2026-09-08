"use server";

import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import { validateConsentRequest, approveConsent, denyConsent } from "@/services/oauth-service";

function stringOrUndefined(value: FormDataEntryValue | null): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function rawFromFormData(formData: FormData) {
  return {
    client_id: stringOrUndefined(formData.get("client_id")),
    redirect_uri: stringOrUndefined(formData.get("redirect_uri")),
    code_challenge: stringOrUndefined(formData.get("code_challenge")),
    scope: stringOrUndefined(formData.get("scope")),
    state: stringOrUndefined(formData.get("state")),
  };
}

// Revalida contra la DB en vez de confiar en los hidden inputs que volvieron
// del navegador — son la misma info que ya vio /oauth/consent, pero se pudo
// tocar en el medio.
export async function approveConsentAction(formData: FormData) {
  const session = await requireSession();
  const { request } = await validateConsentRequest(rawFromFormData(formData));
  const redirectUrl = await approveConsent(session.userId, request);
  redirect(redirectUrl);
}

export async function denyConsentAction(formData: FormData) {
  const { request } = await validateConsentRequest(rawFromFormData(formData));
  redirect(denyConsent(request));
}

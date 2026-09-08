import { createHash } from "node:crypto";

// PKCE S256 (RFC 7636): code_challenge = base64url(sha256(code_verifier)).
// Es lo único que MCP permite; "plain" o ausencia de challenge se rechazan
// antes de llamar a esta función.
export function verifyPkce(codeVerifier: string, codeChallenge: string): boolean {
  const computed = createHash("sha256").update(codeVerifier).digest("base64url");
  return computed === codeChallenge;
}

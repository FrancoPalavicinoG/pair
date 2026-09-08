import { z } from "zod";
import { ConfigError } from "@pair/core";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  // Identidad del AS: va en el campo `issuer` de los metadatos y como base
  // de authorization_endpoint/token_endpoint/registration_endpoint.
  OAUTH_ISSUER_URL: z.string().min(1),
  // Base URL de apps/web, para el redirect a /oauth/consent.
  PAIR_WEB_URL: z.string().min(1),
});

function loadEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    throw new ConfigError(`Invalid environment: ${result.error.message}`);
  }
  return result.data;
}

export const env = loadEnv();

import { z } from "zod";
import { ConfigError } from "@pair/core";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  ENCRYPTION_MASTER_KEY: z.string().min(1),
  GARMIN_AUTH_URL: z.string().min(1),
  GARMIN_AUTH_SHARED_SECRET: z.string().min(1),
});

function loadEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    throw new ConfigError(`Invalid environment: ${result.error.message}`);
  }
  return result.data;
}

export const env = loadEnv();

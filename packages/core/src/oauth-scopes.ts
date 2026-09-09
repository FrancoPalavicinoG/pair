// Fuente única: apps/mcp la anuncia en su metadata OAuth (RFC 9728/8414),
// apps/web la usa para validar el consentimiento y mostrar los permisos en
// lenguaje llano. Una app no puede importar de la otra, así que vive acá.
export const PAIR_OAUTH_SCOPES = [
  "activities:read",
  "metrics:read",
  "workouts:read",
  "workouts:write",
] as const;

export type PairOAuthScope = (typeof PAIR_OAUTH_SCOPES)[number];

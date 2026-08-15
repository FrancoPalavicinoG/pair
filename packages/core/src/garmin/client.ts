import { GarminApiError } from "../errors";
import type { RateLimiter } from "./limiter";

const CONNECT_API_BASE = "https://connectapi.garmin.com";

// UA movil por defecto es lo que Garmin bloquea (confirmado en P0 y P1,
// ver docs/garmin-api.md).
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export type GarminClientDeps = {
  fetch: typeof fetch;
  rateLimiter: RateLimiter;
  getAccessToken: () => Promise<string>;
  refreshAccessToken: () => Promise<string>;
};

export type GarminClient = {
  connectapi<T>(path: string, init?: RequestInit): Promise<T>;
};

// Cliente generico: no sabe de actividades ni de workouts, solo hace el GET/POST
// contra connectapi.garmin.com con el Bearer puesto. Los paths especificos
// (listar actividades, etc.) los pide quien llama, no viven aca.
export function createGarminClient(deps: GarminClientDeps): GarminClient {
  async function doFetch(path: string, token: string, init?: RequestInit): Promise<Response> {
    return deps.fetch(`${CONNECT_API_BASE}${path}`, {
      ...init,
      headers: {
        ...init?.headers,
        Authorization: `Bearer ${token}`,
        "User-Agent": BROWSER_USER_AGENT,
      },
    });
  }

  async function connectapi<T>(path: string, init?: RequestInit): Promise<T> {
    return deps.rateLimiter.schedule(async () => {
      const token = await deps.getAccessToken();
      let res = await doFetch(path, token, init);

      // Un 401 puede ser el access token vencido: se refresca una vez y se
      // reintenta. Si vuelve a fallar, es un error real, no un retry infinito.
      if (res.status === 401) {
        const freshToken = await deps.refreshAccessToken();
        res = await doFetch(path, freshToken, init);
      }

      if (!res.ok) {
        throw new GarminApiError(`Garmin request failed: ${res.status} ${path}`, {
          status: res.status,
          cause: await res.text().catch(() => undefined),
        });
      }
      return res.json() as Promise<T>;
    });
  }

  return { connectapi };
}

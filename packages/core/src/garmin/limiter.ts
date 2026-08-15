export type RateLimiter = {
  schedule<T>(fn: () => Promise<T>): Promise<T>;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Encadena las llamadas para que nunca salgan dos al mismo tiempo, con un
// espacio minimo entre cada una. Sin cola externa: alcanza mientras todo
// pase por una sola instancia de este limiter (ver garmin/client.ts).
export function createRateLimiter(minIntervalMs: number): RateLimiter {
  let chain: Promise<unknown> = Promise.resolve();

  function schedule<T>(fn: () => Promise<T>): Promise<T> {
    const run = chain.then(async () => {
      const result = await fn();
      await sleep(minIntervalMs);
      return result;
    });
    // La cadena sigue aunque una llamada falle; quien pidio esa llamada
    // sigue viendo el error via `run`.
    chain = run.catch(() => undefined);
    return run;
  }

  return { schedule };
}

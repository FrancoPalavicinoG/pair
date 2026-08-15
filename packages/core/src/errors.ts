/** Nunca uses `throw new Error(...)` en el proyecto: extendé PairError. */
export abstract class PairError extends Error {
  abstract readonly code: string;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = this.constructor.name;
  }
}

/** Falta o es inválida una variable de entorno u otra configuración de arranque. */
export class ConfigError extends PairError {
  readonly code = "CONFIG_ERROR";
}

/** Fallo al leer o escribir en la base de datos. */
export class DatabaseError extends PairError {
  readonly code = "DATABASE_ERROR";
}

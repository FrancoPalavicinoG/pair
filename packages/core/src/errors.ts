// Clase base de todos los errores del proyecto.
export abstract class PairError extends Error {
  abstract readonly code: string;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = this.constructor.name;
  }
}

// Falta o es inválida una variable de entorno u otra configuración de arranque.
export class ConfigError extends PairError {
  readonly code = "CONFIG_ERROR";
}

// Fallo al leer o escribir en la base de datos.
export class DatabaseError extends PairError {
  readonly code = "DATABASE_ERROR";
}

// Fallo al cifrar o descifrar un payload (clave equivocada, ciphertext corrupto).
export class DecryptionError extends PairError {
  readonly code = "DECRYPTION_ERROR";
}

// Garmin devolvio un error HTTP (incluye el status en `status` si se conoce).
export class GarminApiError extends PairError {
  readonly code = "GARMIN_API_ERROR";
  readonly status?: number;

  constructor(message: string, options?: { cause?: unknown; status?: number }) {
    super(message, options);
    this.status = options?.status;
  }
}

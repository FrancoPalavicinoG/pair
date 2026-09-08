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

// Fallo de autenticacion propia de PAIR: credenciales invalidas, email ya registrado o input invalido.
export class AuthError extends PairError {
  readonly code = "AUTH_ERROR";
}

// Fallo al leer o escribir en la base de datos.
export class DatabaseError extends PairError {
  readonly code = "DATABASE_ERROR";
}

// Se busco algo (usuario, sesion) que no existe.
export class NotFoundError extends PairError {
  readonly code = "NOT_FOUND";
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

// Fallo del Authorization Server propio (apps/mcp): client inválido, code o
// refresh token inválido/vencido, PKCE que no matchea, etc. `oauthErrorCode`
// es el código de error de OAuth 2.1 (RFC 6749 §5.2: invalid_grant,
// invalid_client, unsupported_grant_type...) que la ruta HTTP devuelve tal cual.
export class OAuthError extends PairError {
  readonly code = "OAUTH_ERROR";
  readonly oauthErrorCode: string;
  readonly status: number;

  constructor(
    oauthErrorCode: string,
    message: string,
    options?: { cause?: unknown; status?: number },
  ) {
    super(message, options);
    this.oauthErrorCode = oauthErrorCode;
    this.status = options?.status ?? 400;
  }
}

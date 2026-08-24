# Spec: Authorization Server OAuth 2.1 (DCR + PKCE) para apps/mcp

Roadmap: P3 (MCP y conectores), primer ítem ("Authorization Server OAuth 2.1 con DCR + PKCE")
Estado: draft

## Objetivo

Que `apps/mcp` tenga su propio Authorization Server OAuth 2.1, implementando la interfaz oficial del SDK de MCP (`OAuthServerProvider`), con soporte de Dynamic Client Registration (para que Claude Desktop/Code se registren solos, sin configuración manual) y PKCE. Es la base de la que dependen el resto de los ítems de P3 (las tools necesitan saber de qué usuario de PAIR es cada request).

Salida observable: Claude Desktop puede descubrir los metadatos OAuth de `apps/mcp`, registrarse dinámicamente, completar el flujo de autorización (con un consentimiento mínimo, no la pantalla pulida), y terminar con un access token válido que `verifyAccessToken` resuelve a un usuario de PAIR.

## Alcance

**Entra**: scaffold de `apps/mcp` (todavía no existe), implementación de `OAuthServerProvider` + `OAuthRegisteredClientsStore` respaldada en Postgres, tablas `oauth_clients`/`oauth_grants`/`oauth_tokens` (ya prefiguradas en `architecture.md`, nunca creadas), montar `mcpAuthRouter` del SDK, un consentimiento **mínimo** (aprobar/denegar, sin scopes legibles todavía).

**No entra** (diferido, no es una omisión):
- Tools de MCP reales (leer datos, escribir workouts): son los ítems siguientes del roadmap, con su propio spec.
- Pantalla de consentimiento pulida con scopes legibles: es su propio ítem del roadmap. Acá solo el mínimo funcional para que el flujo cierre de punta a punta.
- `audit_log`: su propio ítem.
- Revocación desde `/settings/connectors`: más adelante, cuando exista esa vista.

## Diseño

**Investigación previa** (no inventado, fuentes al final): el spec de autorización de MCP exige OAuth 2.1 + PKCE, y pide RFC 9728 (Protected Resource Metadata), RFC 8414 (Authorization Server Metadata), recomienda RFC 7591 (Dynamic Client Registration). `@modelcontextprotocol/sdk` (ya planeado en `docs/setup.md` para `apps/mcp`) trae ese plomero específico de MCP resuelto (`mcpAuthRouter`, `requireBearerAuth`); lo que hay que implementar nosotros es la interfaz `OAuthServerProvider`.

- **`OAuthServerProvider` a mano, sin librería de OAuth de terceros** (decidido junto con el usuario: `node-oidc-provider` era la alternativa, descartada por peso/complejidad para un círculo cerrado de amigos). Interfaz real confirmada contra el paquete publicado (`@modelcontextprotocol/sdk`, no de memoria):
  ```ts
  interface OAuthServerProvider {
    get clientsStore(): OAuthRegisteredClientsStore;
    authorize(client, params, res): Promise<void>;
    challengeForAuthorizationCode(client, authorizationCode): Promise<string>;
    exchangeAuthorizationCode(client, authorizationCode, codeVerifier?, redirectUri?, resource?): Promise<OAuthTokens>;
    exchangeRefreshToken(client, refreshToken, scopes?, resource?): Promise<OAuthTokens>;
    verifyAccessToken(token): Promise<AuthInfo>;
    revokeToken?(client, request): Promise<void>; // opcional, no entra en este ítem
  }
  interface OAuthRegisteredClientsStore {
    getClient(clientId): OAuthClientInformationFull | undefined | Promise<...>;
    registerClient?(client): OAuthClientInformationFull | Promise<...>; // sin esto, no hay DCR
  }
  ```
- **PKCE lo valida el SDK, no nosotros**: `skipLocalPkceValidation` queda en `false` (default) — el SDK verifica el `code_verifier` contra el challenge antes de llamar a `exchangeAuthorizationCode`. Nuestro trabajo es guardar el challenge en `challengeForAuthorizationCode` y no reinventar esa validación.
- **`verifyAccessToken` devuelve `AuthInfo` con el `userId` de PAIR en `extra`** (`AuthInfo.extra: Record<string, unknown>`, campo pensado justo para esto). Es la única forma en que las tools de MCP (próximo ítem) van a saber de qué usuario es cada request — nunca aceptando un `userId` como argumento de una tool, regla dura de `CLAUDE.md` raíz.
- **Tablas nuevas** (ya nombradas en `architecture.md`, nunca creadas): `oauth_clients` (resultado de `registerClient`, un row por client registrado dinámicamente), `oauth_grants` (un authorization code o refresh token activo, atado a `userId` + `clientId` + scopes), `oauth_tokens` (access tokens activos, atados a un grant). Mismo patrón CSR de siempre: repository nuevo en `packages/db/src/repositories/oauth.ts`.
- **Consentimiento mínimo**: `authorize()` redirige a una página de `apps/web` (ej. `/oauth/consent`) que muestra "¿autorizás a {client_name} a acceder a tu cuenta de PAIR?" con aprobar/denegar — sin lista de scopes legibles todavía (eso es su propio ítem). Requiere sesión de PAIR activa (reusa `requireSession`).
- **`apps/mcp` se crea en este ítem** (scaffold mínimo: Hono + `@modelcontextprotocol/sdk`, según `docs/setup.md`), aunque las tools reales lleguen en el ítem siguiente — el AS necesita un servidor donde montarse.

## Checklist de implementación

- [ ] Scaffold de `apps/mcp` (Hono, `@modelcontextprotocol/sdk`, `@pair/core`, `@pair/db`)
- [ ] Schema + migración: `oauth_clients`, `oauth_grants`, `oauth_tokens`
- [ ] `packages/db/src/repositories/oauth.ts`: repository nuevo
- [ ] Implementación de `OAuthRegisteredClientsStore` (`getClient`, `registerClient`)
- [ ] Implementación de `OAuthServerProvider` (los 5 métodos requeridos)
- [ ] `/oauth/consent` mínimo en `apps/web`
- [ ] Montar `mcpAuthRouter` en `apps/mcp` con el provider
- [ ] Probado end-to-end: un cliente OAuth de prueba (no Claude Desktop todavía, algo más simple/controlado) completa DCR + PKCE + consentimiento + intercambio de código, y `verifyAccessToken` resuelve el `userId` correcto

## Preguntas abiertas

Ninguna — se prueba con `@modelcontextprotocol/inspector` (tool oficial de Anthropic para MCP, soporta OAuth 2.1 + PKCE + DCR + descubrimiento de metadata). Requiere Node ≥22.19.0; la máquina de desarrollo solo tiene Node 20.19.0 (`docs/setup.md`) — hace falta `nvm`/`fnm` para tener los dos sin reemplazar el que usa el resto del proyecto. Resolver esto es un paso previo al testing, no bloquea escribir el código.

## Fuentes de la investigación

- [Authorization - Model Context Protocol](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization) — spec oficial de autorización de MCP
- [modelcontextprotocol/typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk) — SDK oficial, `mcpAuthRouter`/`requireBearerAuth`/`OAuthServerProvider`
- Interfaces `OAuthServerProvider`, `OAuthRegisteredClientsStore`, `AuthInfo` confirmadas contra el paquete publicado en npm (`@modelcontextprotocol/sdk`, `dist/esm/server/auth/{provider,clients,types}.d.ts`), no de memoria ni de documentación de terceros
- [node-oidc-provider](https://github.com/panva/node-oidc-provider) — alternativa considerada y descartada, referencia si en algún momento el `OAuthServerProvider` a mano se vuelve difícil de mantener

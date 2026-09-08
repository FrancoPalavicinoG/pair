# Spec: Authorization Server OAuth 2.1 (DCR + PKCE) para apps/mcp

Roadmap: P3 (MCP y conectores), primer ítem ("Authorization Server OAuth 2.1 con DCR + PKCE")
Estado: hecho

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

## Actualización (2026-09-08): el router del SDK está deprecado

Investigado al arrancar la implementación (no estaba confirmado cuando se escribió este spec): `mcpAuthRouter`/`OAuthServerProvider` tal como se citan arriba son de la **v1** del SDK, y quedaron congelados en `@modelcontextprotocol/server-legacy/auth` — deprecados, con la recomendación oficial de "migrar el AS a un IdP dedicado". Además es Express, no Hono.

Esto **refuerza, no contradice**, la decisión de más arriba de implementar `OAuthServerProvider` a mano: la alternativa "oficial" (usar el router del SDK) ya no es una opción mantenida. Se extendió la misma decisión al router HTTP: `apps/mcp/src/oauth/routes.ts` implementa a mano, en Hono, los cuatro endpoints (metadata RFC 8414, DCR RFC 7591, `/authorize`, `/token`), sin ninguna dependencia del SDK de MCP. `@modelcontextprotocol/sdk` no se instala en este ítem — se instala en el de las tools (transport Streamable HTTP), que es cuando hace falta.

Los 5 métodos de `OAuthServerProvider` se colapsaron en 4 funciones en `apps/mcp/src/oauth/provider.ts`: `challengeForAuthorizationCode` no existe como función aparte porque, al no depender del SDK para la validación de PKCE, `exchangeAuthorizationCode` lee el `code_challenge` guardado y llama a `verifyPkce` en el mismo paso — no hace falta la coreografía separada de "buscar el challenge, verificar, después canjear" que el SDK exigía.

Tokens y authorization codes se guardan **hasheados con SHA-256** (`hashToken` en `packages/db/src/crypto.ts`), no cifrados: nunca hace falta leerlos de vuelta, solo verificar que lo que presenta el cliente coincide.

## Checklist de implementación

- [x] Scaffold de `apps/mcp` (Hono, `@pair/core`, `@pair/db` — sin `@modelcontextprotocol/sdk`, ver nota arriba)
- [x] Schema + migración: `oauth_clients`, `oauth_grants`, `oauth_tokens`
- [x] `packages/db/src/repositories/oauth.ts`: repository nuevo
- [x] `getClient`/`registerClient` (`apps/mcp/src/oauth/provider.ts`)
- [x] Lógica de `OAuthServerProvider` a mano (`apps/mcp/src/oauth/provider.ts`): `buildConsentRedirect`, `exchangeAuthorizationCode`, `exchangeRefreshToken`, `verifyAccessToken`
- [x] `/oauth/consent` mínimo en `apps/web` (route group `(oauth-consent)`, servicio `oauth-service.ts`)
- [x] Rutas HTTP del AS montadas en `apps/mcp` (`src/oauth/routes.ts`, sin `mcpAuthRouter` — ver nota arriba)
- [x] Probado end-to-end con `curl` manejando cookie de sesión real y el HTML real de `/oauth/consent` (ver nota de testing más abajo): registro → `/authorize` → consentimiento real (aprobar y denegar) → `/token` → `verifyAccessToken` resuelve el `userId` correcto. Incluye una prueba de que un `redirect_uri` alterado a mano en el POST de aprobación se rechaza (revalidación server-side, no confía en los hidden inputs que vuelven del navegador).

## Actualización (2026-09-08): cómo se probó de punta a punta, sin el inspector

El plan original de esta sección era probar con `@modelcontextprotocol/inspector`. No se usó: ese cliente descubre OAuth a partir de un 401 del endpoint real de MCP (RFC 9728, Protected Resource Metadata) — intenta usar el recurso primero, y recién ahí arranca DCR/consentimiento/token. `apps/mcp` todavía no tiene ningún endpoint MCP (`/mcp` llega en el próximo ítem del roadmap, con las tools), así que no había garantía de que el inspector supiera descubrir el AS apuntándolo a un servidor que hoy solo tiene rutas OAuth.

En cambio, se probó con `curl` haciendo de cliente OAuth real (exactamente lo que pedía el checklist: "algo más simple/controlado"): sesión de `apps/web` minteada vía el repository (sin pelear la codificación de Server Actions del login), registro real, `/authorize` real, HTML real de `/oauth/consent` parseado para extraer los campos del formulario (incluido lo que Next.js inyecta para el fallback sin JS de la Server Action), POST real de aprobar/denegar, code real, canje real, `verifyAccessToken` real. La prueba con el inspector contra un cliente de terceros de verdad queda para cuando exista `/mcp`.

## Preguntas abiertas

Ninguna.

## Fuentes de la investigación

- [Authorization - Model Context Protocol](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization) — spec oficial de autorización de MCP
- [modelcontextprotocol/typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk) — SDK oficial, `mcpAuthRouter`/`requireBearerAuth`/`OAuthServerProvider`
- Interfaces `OAuthServerProvider`, `OAuthRegisteredClientsStore`, `AuthInfo` confirmadas contra el paquete publicado en npm (`@modelcontextprotocol/sdk`, `dist/esm/server/auth/{provider,clients,types}.d.ts`), no de memoria ni de documentación de terceros
- [node-oidc-provider](https://github.com/panva/node-oidc-provider) — alternativa considerada y descartada, referencia si en algún momento el `OAuthServerProvider` a mano se vuelve difícil de mantener
- [Upgrading from v1.x to v2](https://ts.sdk.modelcontextprotocol.io/v2/migration/upgrade-to-v2) y [Authorization en v2](https://ts.sdk.modelcontextprotocol.io/v2/serving/authorization.html) — confirman que los helpers de AS del SDK (`mcpAuthRouter`, `OAuthServerProvider`, etc.) pasaron a `@modelcontextprotocol/server-legacy/auth` (deprecado), origen de la nota de actualización de arriba

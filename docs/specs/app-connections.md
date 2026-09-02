# Spec: Gate de conexión Garmin + hub "Connections"

Roadmap: P3 (MCP y conectores), primer ítem ("Gate de conexión Garmin + hub 'Connections'")
Estado: draft

## Objetivo

Que conectar Garmin deje de ser una vista navegable con botón en el sidebar y pase a ser un gate: si el usuario no tiene credenciales de Garmin o su token expiró, cualquier ruta de `(app)` lo redirige directo a esa vista, igual que `requireSession()` hoy redirige a `/login` sin sesión. Conectado, no la vuelve a ver. El tab que hoy dice "Connect Garmin" en el sidebar se reemplaza por "Connections", que a futuro (P3, resto del ítem) va a alojar el conector MCP — por ahora, un placeholder.

Salida observable: un usuario nuevo que nunca conectó Garmin, al entrar a `/dashboard` (o cualquier ruta de `(app)`), termina en la vista de login de Garmin sin haber clickeado nada. Un usuario ya conectado navega libre y nunca ve esa vista. Si el token expira, la próxima navegación lo vuelve a mandar ahí. El sidebar tiene un tab "Connections" (no "Connect Garmin") que muestra un placeholder.

## Alcance

**Entra**: el mecanismo de gate, la actualización del nav del sidebar, la ruta `/connections` con placeholder, decidir si el bloque de estado de Garmin al fondo del sidebar (`GarminStatusBlock`, hoy con botones Connect/Reconnect/Sync now) sigue haciendo falta con el gate ya activo.

**No entra** (diferido, no es una omisión):
- La vista real del conector MCP (URL de conexión, instrucciones por cliente, sesiones activas, revocación): es el resto de P3, depende del Authorization Server que todavía no existe. Acá solo el placeholder.
- Cualquier cambio a la lógica de login/MFA de Garmin en sí (`(app)/settings/garmin/actions.ts`, el formulario de dos pasos): ya existe y funciona (`app-garmin-connect.md`), no se toca.

## Diseño

- **El gate no puede vivir tal cual en `(app)/layout.tsx`**: ese layout envuelve también `/settings/garmin` (la vista de login de Garmin), así que un redirect incondicional ahí mismo crea un loop — redirige a la página a la que ya estás yendo. `(app)/layout.tsx` tampoco recibe el pathname actual como prop (App Router no lo expone así a un layout), así que "redirigir salvo si ya estoy en esa ruta" no es tan directo como en un `if`.
- **Alternativa que sí resuelve esto, mismo patrón que ya usa el repo para `(auth)` vs. `(app)`**: sacar `/settings/garmin` del grupo `(app)` y ponerla en su propio grupo de rutas (ej. `(garmin-connect)/settings/garmin/page.tsx`). Los grupos entre paréntesis no aparecen en la URL — la ruta sigue siendo `/settings/garmin`, solo cambia qué layout la envuelve. Esa página sigue exigiendo sesión de PAIR (`requireSession()`), pero no pasa por el gate de Garmin porque ya no cuelga de `(app)/layout.tsx`. Es exactamente cómo `(auth)/login` hoy no exige sesión mientras `(app)` sí la exige — mismo mecanismo, un gate distinto.
- **`GarminStatusBlock`** (botones Connect/Reconnect/Sync now al fondo del sidebar): con el gate activo, nunca deberías estar "adentro" de `(app)` sin Garmin conectado, así que el estado `not_connected`/`needs_reconnect` de ese bloque queda inalcanzable en la práctica. Se simplifica a solo mostrar `Sync now` / `Syncing…` (los dos estados que sí pueden ocurrir estando adentro). Si en algún momento hace falta un botón de reconexión manual sin esperar el gate, se agrega entonces.
- **Placeholder de `/connections`**: página estática mínima ("MCP connector — coming soon"), sin lógica. Mismo patrón que cualquier página sin estado de este proyecto.

## Checklist de implementación

- [ ] Mover `(app)/settings/garmin/` a su propio grupo de rutas fuera de `(app)` (ej. `(garmin-connect)/settings/garmin/`), conservando `requireSession()` adentro
- [ ] `requireGarminConnection()` (o nombre equivalente) en `apps/web/src/lib/garmin-status.ts`: redirige a `/settings/garmin` si el estado es `not_connected` o `needs_reconnect`
- [ ] Llamar ese helper desde `(app)/layout.tsx`, junto a `requireSession()`
- [ ] `app-shell.tsx`: `NAV_ITEMS` pierde `Connect Garmin`, gana `Connections` → `/connections`
- [ ] `(app)/connections/page.tsx`: placeholder
- [ ] Simplificar `GarminStatusBlock` a los estados `syncing`/`connected` únicamente
- [ ] Probado en vivo: cuenta nueva sin credenciales termina en `/settings/garmin` al entrar a `/dashboard`; conectado, navegar no muestra esa vista; forzar `needs_reconnect` (credenciales inválidas a mano en DB) dispara el redirect de nuevo; `/settings/garmin` no loopea

## Preguntas abiertas

- Nombre final del grupo de rutas nuevo para `/settings/garmin` (cosmético, se resuelve al escribir el código).
- Si el placeholder de `/connections` necesita algo más que texto estático para esta pasada, o alcanza con "coming soon".

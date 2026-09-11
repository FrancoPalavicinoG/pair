# Spec: Perfil físico y zonas de esfuerzo (sync desde Garmin)

Roadmap: P5 (Perfil de usuario y señales diarias), ítems "Datos físicos básicos" y "Zonas de esfuerzo por deporte"
Estado: draft

## Objetivo

Que PAIR tenga, sincronizado desde Garmin, lo que un plan de entrenamiento necesita saber del usuario sin preguntárselo cada vez: altura/peso, zonas de FC por deporte, y FTP de ciclismo. Es la pieza que le falta al traductor de `workout-dsl.md` para resolver un target por zona ("zona 3 de FC") a un valor absoluto, y la que le falta a Claude para armar un plan (P6) sin pedirle el número al usuario en cada mensaje.

Salida observable: con Garmin conectado y sincronizado, PAIR tiene guardadas las zonas de FC reales del usuario (por deporte) y su FTP vigente; una tool de MCP nueva se las devuelve a Claude en texto legible.

## Alcance

**Entra**: schema + sync + repository para perfil físico (altura, peso, días de entreno preferidos) y zonas de esfuerzo (FC por deporte, FTP de ciclismo). Una tool de lectura (`get_user_profile`).

**No entra** (diferido, no es una omisión):
- **Ritmo de umbral de running**: el campo existe en Garmin (`lactateThresholdSpeed`) pero su unidad no se pudo confirmar — da un ritmo imposible (~49 min/km) si se asume m/s literal (`docs/garmin-api.md`, investigado 2026-09-10). No se guarda hasta confirmar contra lo que la app de Garmin le muestra al usuario como "ritmo de umbral". Sin esto, `paceZone` de `workout-dsl.md` queda sin poder resolverse todavía — `hrZone`/`powerZone` sí.
- **Edición manual**: el roadmap dice "sync desde Garmin cuando esté disponible, manual si no", pero acá solo se construye el sync. La vía manual (¿tool de chat? ¿formulario en la web?) es su propia decisión de diseño, para cuando haya un usuario real sin zonas configuradas en Garmin que lo necesite — no antes.
- **Historial de ejercicio de fuerza** y **dog factor**: son los otros dos ítems de P5, sin relación con Garmin ni con este schema — specs propios.
- **Resolución de targets por zona dentro del traductor**: ya diseñado en `docs/architecture.md` ("Flujo: plan de entrenamiento conversacional") — vive en la tool de MCP que arma el `PairWorkout`, `packages/core` sigue sin tocar la DB.
- **`training_plans`/`planned_sessions` (P6)**: spec propio, después de este.

## Diseño

### Qué se sincroniza, y de dónde (confirmado 2026-09-10 contra cuenta real, `docs/garmin-api.md`)

- **Perfil físico**: `GET /userprofile-service/userprofile/user-settings` → `userData.height` (cm), `userData.weight` (**gramos**, confirma la sospecha ya anotada en `daily_metrics.weight`), `userData.availableTrainingDays`/`preferredLongTrainingDays` (para cuándo P6 necesite ubicar la sesión larga de la semana).
- **Zonas de FC**: `GET /biometric-service/heartRateZones` → array, una entrada por deporte configurado. En la cuenta probada: `"sport": "DEFAULT"` (running/general) y `"sport": "CYCLING"`, cada una con `zone1Floor`...`zone5Floor` (bpm absolutos), `restingHeartRateUsed`, `maxHeartRateUsed`, `lactateThresholdHeartRateUsed`. **No confirmado**: si un usuario con natación o fuerza configuradas en Garmin devuelve más entradas (`"sport": "SWIMMING"`, etc.) — se guarda el `sport` tal cual lo manda Garmin, sin asumir que la lista de valores posibles es solo `DEFAULT`/`CYCLING`.
- **FTP de ciclismo**: `GET /biometric-service/stats/functionalThresholdPower/range/{start}/{end}?sport=CYCLING&aggregation=daily&aggregationStrategy=LATEST` → array de eventos de cambio, se toma el de `updatedDate` más reciente como vigente.

### Mapeo `PairWorkout.sport` → `sport` de Garmin

`workout-dsl.md` usa `'running' | 'cycling' | 'swimming' | 'strength'`. Garmin usa `DEFAULT`/`CYCLING` (confirmado, para esta cuenta). El mapeo confirmado hasta ahora es `running → DEFAULT`, `cycling → CYCLING`; `swimming`/`strength` quedan sin mapeo confirmado (no vistos en la cuenta de prueba). La función de resolución intenta el sport específico primero y cae a `DEFAULT` si no existe una entrada para ese deporte — así un `swimming`/`strength` sin zona propia igual resuelve contra algo razonable en vez de fallar.

### Schema (`packages/db`)

`schema/user-profile.ts` — una fila por usuario:

```ts
export const userProfile = pgTable("user_profile", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  heightCm: integer("height_cm"),
  weightGrams: integer("weight_grams"), // gramos, confirmado — no kg
  availableTrainingDays: text("available_training_days").array(),
  preferredLongTrainingDays: text("preferred_long_training_days").array(),
  syncedAt: timestamp("synced_at", { withTimezone: true }),
});
```

`schema/sport-zones.ts` — una fila por usuario + deporte (el `sport` es el string que devuelve Garmin, no un enum cerrado nuestro — ver mapeo arriba):

```ts
export const sportZones = pgTable(
  "sport_zones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    sport: text("sport").notNull(), // "DEFAULT" | "CYCLING" | lo que Garmin devuelva
    hrZone1Floor: integer("hr_zone_1_floor"),
    hrZone2Floor: integer("hr_zone_2_floor"),
    hrZone3Floor: integer("hr_zone_3_floor"),
    hrZone4Floor: integer("hr_zone_4_floor"),
    hrZone5Floor: integer("hr_zone_5_floor"),
    restingHeartRate: integer("resting_heart_rate"),
    maxHeartRate: integer("max_heart_rate"),
    lactateThresholdHeartRate: integer("lactate_threshold_heart_rate"),
    ftpWatts: integer("ftp_watts"), // solo tiene sentido para cycling, null en el resto
    syncedAt: timestamp("synced_at", { withTimezone: true }),
  },
  (table) => [unique().on(table.userId, table.sport)],
);
```

Sin `powerZoneXFloor`: Garmin da FTP, no un array de pisos de zona de potencia ya calculado (a diferencia de FC) — si hace falta resolver `powerZone`, se deriva del FTP con porcentajes estándar de ciclismo (ej. zona 3 = 76-90% FTP) en la función de resolución, no se guarda precalculado. Esto es una convención de la industria del ciclismo, no un invento nuestro, pero **queda para confirmar los porcentajes exactos cuando se implemente la resolución de `powerZone`**, no ahora.

### Repository y sync

`packages/db/src/repositories/user-profile.ts` (`findUserProfile`, `upsertUserProfile`) y `sport-zones.ts` (`findSportZones(userId)` → todas las filas del usuario, `upsertSportZone`). Mismo patrón CSR de siempre.

`packages/sync/src/garmin-sync-service.ts`: nueva función `syncUserProfile(userId, client)`, llamada una vez por corrida de sync completa (3 GETs — despreciable contra el rate limiter, y estos datos cambian rara vez, no hace falta una cadencia separada de la sync normal).

### Tool de MCP: `get_user_profile`

Scope: **nuevo**, `profile:read` — decisión explícita, alternativa considerada: reusar `metrics:read`. Se descarta reusar porque conceptualmente son cosas distintas (zonas/FTP son configuración estable, no una métrica que cambia día a día) y porque separarlo permite que alguien autorice "leer mis métricas diarias" sin autorizar "leer mi perfil físico", o viceversa. Implica agregar `"profile:read"` a `PAIR_OAUTH_SCOPES` (`packages/core/src/oauth-scopes.ts`) y su label en `SCOPE_LABELS` (`apps/web/src/services/oauth-service.ts`).

Sin input. Devuelve: altura/peso (convertido a unidades humanas — kg desde gramos, cm tal cual), días de entreno preferidos, y una sección por deporte con sus zonas de FC (rangos, no solo el piso) y FTP si aplica. Si el usuario no tiene zonas configuradas en Garmin (array vacío), el mensaje lo dice explícito en vez de devolver una sección vacía — mismo criterio que ya siguen las otras tools ante "sin datos".

## Checklist de implementación

- [ ] `packages/db/src/schema/user-profile.ts`, `sport-zones.ts` + migración
- [ ] `packages/db/src/repositories/user-profile.ts`, `sport-zones.ts`
- [ ] `packages/sync/src/garmin-sync-service.ts`: `syncUserProfile`, llamada desde el flujo de sync completo
- [ ] `packages/core/src/oauth-scopes.ts`: agregar `"profile:read"` a `PAIR_OAUTH_SCOPES`
- [ ] `apps/web/src/services/oauth-service.ts`: label de `profile:read` en `SCOPE_LABELS`
- [ ] `apps/mcp/src/tools/get-user-profile.ts` + registrar en `mcp-session.ts`
- [ ] Actualizar tabla de tools de `apps/mcp/CLAUDE.md`
- [ ] Sync probado contra la cuenta real: correr una sync completa, confirmar que `user_profile`/`sport_zones` quedan pobladas con los valores ya vistos en la investigación
- [ ] Tool probada con Claude Desktop real

## Preguntas abiertas

- Si Garmin devuelve zonas para `swimming`/`strength` en alguna cuenta real (no visto todavía) y con qué `sport` string exacto — se confirma la primera vez que aparezca, no bloquea implementar con el mapeo `running`/`cycling` ya confirmado.
- Porcentajes exactos de zona de potencia desde FTP (para cuando se implemente resolver `powerZone`) — no bloquea este spec, que solo guarda el FTP crudo.

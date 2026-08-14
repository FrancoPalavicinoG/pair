# packages/db

PostgreSQL + Drizzle. Schema, migraciones y cliente.

Postgres se eligió por `JSONB` con índices GIN (guardamos el payload crudo de Garmin junto al normalizado) y por su manejo serio de zonas horarias. Drizzle por ser SQL-first y no meter un motor extra en runtime.

## Reglas

- **Nunca edites una migración ya aplicada.** Crea una nueva.
- Toda tabla con datos de usuario lleva `user_id` con FK y `ON DELETE CASCADE`. Toda query filtra por `user_id`. Sin excepciones: aquí es donde se filtran los datos de un amigo a otro.
- Los tokens de Garmin se guardan cifrados con clave derivada por usuario; la clave maestra vive en el entorno, nunca en la DB. La columna guarda ciphertext, nunca el valor. El schema no debe permitir escribir un token en claro por accidente: tipo custom que solo acepta el envoltorio cifrado.
- Payload crudo de Garmin en `JSONB` junto al dato normalizado. Lo que el dashboard filtre u ordene va en columna propia e indexada; el resto se queda en el JSONB.
- Timestamps `timestamptz`. Además, para actividades, guardar la hora local del usuario tal como la reporta Garmin: un entrenamiento de las 6am importa como "6am", no como su UTC.
- Nada de borrado físico de actividades sincronizadas: `deleted_at`. Garmin puede devolver una actividad y luego dejar de hacerlo.

## Comandos

```bash
pnpm db:generate   # tras editar el schema
pnpm db:migrate
pnpm db:studio
```

## Grupos de tablas

| Grupo | Contenido |
|---|---|
| Identidad | `users`, `sessions` |
| Garmin | `garmin_credentials` (cifrado), `sync_state` |
| Datos | `activities`, `daily_metrics`, `workouts`, `workout_schedules` |
| MCP | `oauth_clients`, `oauth_tokens`, `mcp_audit_log` |
| Dashboard | `dashboard_layouts`, `custom_metrics` |

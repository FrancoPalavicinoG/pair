---
description: Añadir una tool nueva al servidor MCP
argument-hint: [nombre y propósito de la tool]
allowed-tools: Read, Glob, Grep, Edit, Write, Bash
---

Tool: $ARGUMENTS

Lee `apps/mcp/CLAUDE.md` antes de empezar. Checklist obligatorio:

- [ ] Nombre en snake_case con prefijo de dominio (`garmin_*`, `workout_*`).
- [ ] Input y output validados con Zod en `packages/core`. El output es lo que ve Claude: legible, sin ruido, sin IDs internos que no pueda usar.
- [ ] `description` escrita para que Claude sepa *cuándo* usarla, no solo qué hace. Incluye cuándo NO usarla.
- [ ] ¿Escribe en Garmin? Entonces va en dos fases: `*_preview` (idempotente, devuelve resumen legible + `preview_token`) y `*_create|update|delete` (consume el token). Nunca una tool de escritura en un solo paso.
- [ ] Scope OAuth declarado y verificado contra el token de la sesión.
- [ ] Pasa por el rate limiter. Sin excepciones.
- [ ] Errores de Garmin traducidos a mensajes accionables para el usuario final, no stack traces.
- [ ] Test con fixture, sin red.
- [ ] Añadida a la tabla de tools de `apps/mcp/CLAUDE.md`.

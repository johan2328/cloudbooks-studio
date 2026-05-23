# AI-200 Production Studio

Consola editorial full-stack para un equipo de 4 personas que produce el libro de infografías de certificación Microsoft AI-200. Interfaz completamente en español.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — API server (port 8080)
- `pnpm --filter @workspace/studio run dev` — Frontend React+Vite (port 18425)
- `pnpm run typecheck` — typecheck completo
- `pnpm run build` — typecheck + build de todos los paquetes
- `pnpm --filter @workspace/api-spec run codegen` — regenerar hooks Zod + React Query desde spec OpenAPI
- `pnpm --filter @workspace/db run push` — push de cambios de esquema DB (solo dev)
- Required env: `DATABASE_URL` — Postgres connection string
- Optional env: `OPENAI_API_KEY` — si no está presente, generación corre en modo demo

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 — port 8080, paths `/api`
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (desde spec OpenAPI)
- Frontend: React + Vite + Wouter + TanStack Query + shadcn/ui + Tailwind CSS
- Build: esbuild (CJS bundle para el server)

## Where things live

```
artifacts/
  api-server/src/
    app.ts                   — Express app, monta router en /api
    routes/
      auth.ts                — POST /auth/login, GET /auth/me, POST /auth/logout
      pages.ts               — CRUD de páginas, aprobación, revisión, stats, batches
      qa.ts                  — GET/PUT /qa/:pageId
      generation.ts          — GET/POST /generation/runs
      contract.ts            — GET/PUT /contract
  studio/src/
    App.tsx                  — Router raíz con AuthProvider + PrivateRoute
    main.tsx                 — setAuthTokenGetter desde localStorage
    lib/
      auth.tsx               — AuthContext (login, logout, persistencia localStorage)
      utils.ts               — helpers de colores, labels, fechas
    pages/
      login.tsx              — selección de perfil + PIN
      biblioteca.tsx         — grid de 61 infografías con filtros
      contenido.tsx          — formulario de Contenido y Grounding por página
      generacion.tsx         — disparar generación OpenAI, historial de corridas
      qa.tsx                 — panel diagnóstico QA, vista previa, aprobar/rechazar
      exportacion.tsx        — tabla de exportación de páginas aprobadas
      contrato.tsx           — Contrato Visual (reglas no negociables / flexibles / estables)
    components/
      Layout.tsx             — sidebar + topbar + usuario activo
lib/
  api-spec/openapi.yaml      — fuente de verdad del contrato API
  api-client-react/          — hooks React Query generados por Orval
  api-zod/                   — schemas Zod generados por Orval
  db/                        — esquema Drizzle ORM (users, pages, qa_records, generation_runs, visual_contracts)
```

## Architecture decisions

- **Auth demo**: token `demo-token-{userId}` en localStorage, pasado via `Authorization: Bearer` en cada request. `setAuthTokenGetter` configurado en `main.tsx`. No JWT real — equipo interno de 4 personas.
- **OpenAPI-first**: toda la superficie de la API definida en `openapi.yaml` antes de implementar. Hooks y schemas se regeneran con `codegen`.
- **Generación server-side**: llamadas a OpenAI solo desde el servidor (nunca desde el browser). Sin `OPENAI_API_KEY` corre en modo demo.
- **QA score en `pages`**: el campo `qaScore` en la tabla `pages` se actualiza cada vez que se hace upsert de un registro QA — desnormalización deliberada para queries de lista rápidas.
- **Proxy path-based**: el proxy de Replit enruta `/api` al API server y `/` al frontend Vite.

## Product

61 infografías organizadas en 13 batches. El flujo editorial es:
1. **Biblioteca** — vista general con filtros por batch, estado, dominio
2. **Contenido y Grounding** — editar contexto, conceptos, trampas de examen, autocheck, fuentes
3. **Generación** — disparar generación GPT-4o (server-side), ver historial de corridas
4. **QA y Aprobación** — panel de diagnóstico con 4 dimensiones de score, vista previa de la infografía, aprobar / solicitar corrección / regenerar
5. **Exportación** — tabla de páginas aprobadas/exportadas con acciones por formato
6. **Contrato Visual** — reglas editoriales no negociables, storytelling flexible, componentes estables, changelog

## User preferences

- Interfaz 100% en español
- Tema: azul profundo `#0d1629`, acento teal `#0d9488`, sin rojo de placeholder
- Densidad alta (estilo herramienta profesional, no dashboard consumer)
- Radio pequeño `0.3rem` en todos los componentes

## Gotchas

- Siempre reiniciar el workflow del API server tras cambios en `artifacts/api-server/src/` (el dev script hace `build && start`).
- `pnpm run dev` en la raíz NO existe por diseño. Usar los workflows de Replit.
- El token de auth se inyecta en `main.tsx` via `setAuthTokenGetter` — si se refactoriza el entry point, replicar esa llamada.
- La columna `runCount` en `pages` es un entero simple (no auto-increment correcto) — al registrar una corrida se debe hacer UPDATE manualmente.

## Pointers

- Ver skill `pnpm-workspace` para estructura del workspace y TypeScript
- Ver `lib/api-spec/openapi.yaml` para el contrato completo de la API

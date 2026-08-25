# studio-engine — InDesign AI engine (v2)

Motor editorial **local y Replit-ready** para el InDesign AI de CloudBooks.
Es **paralelo** al `api-server` de Codex: **no lo modifica**. Aprende de su lógica
(contrato editorial, golden master determinista, QA, seeds) y la lleva al
siguiente nivel por corridas.

## Qué hace hoy (Corrida 1)
- Sirve un **catálogo operativo** (seeds AI-200 · Visual Atlas + estado de outputs).
- Expone todo bajo el prefijo **`/engine`** (no colisiona con `/api` de Codex).
- Escribe/lee salidas en un **namespace propio**: `artifacts/studio/public/assets/cloudbooks-engine/...`
  (servido por Vite, separado de las salidas de Codex en `.../cloudbooks/...`).

Endpoints:
- `GET /engine/health`
- `GET /engine/key-status` — modelos, store, si hay OPENAI_API_KEY.
- `GET /engine/catalog` — `StudioCatalog`-like (lo entiende la cabina del frontend).
- `GET /engine/output-status/:pageId`
- `GET /engine/seed/:pageId`

La generación real (imagen + render + QA) llega en las corridas siguientes.

## Correr en local
```bash
cp .env.example .env        # y completá OPENAI_API_KEY si querés generar luego
pnpm install                # desde la raíz del monorepo
pnpm --filter @workspace/studio-engine dev
```
Por defecto escucha en `http://localhost:8790`. El frontend (Vite) lo alcanza
vía proxy: `/engine/*` → `ENGINE_URL` (default `http://localhost:8790`).

> Nota de runtime: el monorepo está afinado para **Linux/Replit** (los binarios
> win32 de esbuild están excluidos en `pnpm-workspace.yaml`). `tsx`/`vite` corren
> en el runtime Linux/Replit o WSL. El typecheck (`tsc`) es multiplataforma.

## Subir a Replit
- Cargar `OPENAI_API_KEY` (y opcionalmente `ENGINE_PORT`, `STORE`) como **Secrets**.
- Comando de arranque: `pnpm --filter @workspace/studio-engine start`.
- Las salidas quedan bajo `studio/public/assets/cloudbooks-engine/` y se sirven
  como estáticos.

## Variables de entorno
Ver `.env.example`. Postgres (`STORE=pg`) se integra en la corrida 15; hasta
entonces el store es en archivos.

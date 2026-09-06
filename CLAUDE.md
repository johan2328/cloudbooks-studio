# CloudBooks Studio — manual del proyecto (para la IA)

**Qué es:** fábrica editorial + storefront de **libros de certificación cloud** en español neutro LATAM. Un motor multi-agente produce los libros; una app React es a la vez **cockpit interno de producción** y **tienda pública**. Metodología: "estudio editorial humano-agentes" con auditoría humana final y **QA objetivo ≥ 9.5**.

**Producto:** 6 formatos por certificación — `master-book` (profundidad), `visual-atlas` (una skill = una lámina), `exam-traps`, `question-bank`, `cheat-sheets`, `rapid-review` — más el bundle **Collection Pack** = 7 SKUs/cert. El engine tiene el **canon de 67 certs Microsoft** (auto-sync mensual del póster oficial); el storefront expone **7 comerciales** (AI-200 y AB-620 vivos; el resto con ETA). **Checkout y biblioteca son simulados** (localStorage, sin backend de pagos).

> Detalle completo (árbol, fronteras, modelo de estado, roster de agentes, deuda técnica): **`docs/ARCHITECTURE.md`**.

## Paquetes (pnpm workspaces, sin turbo/nx)
| Paquete | Rol | Puerto |
|---|---|---|
| `artifacts/studio-engine` | **motor de libros** (`/engine/*`, tsx, OpenAI/Azure, puppeteer, pdf-lib) | **8790** (bind `127.0.0.1`) |
| `artifacts/studio` | frontend React+Vite: cockpit interno **y** tienda | Vite (`PORT` **obligatorio**) |
| `artifacts/api-server` | backend Express+Drizzle/Postgres, OpenAPI-first (`/api`) | 8080 |
| `lib/api-spec · api-zod · api-client-react · db` | contrato OpenAPI + generados (Orval) + esquema Drizzle | — |

**Fronteras reales:** `studio → api-client-react` (HTTP `/api`); `api-server → api-zod, db`; **`studio-engine` no tiene deps de workspace**; `studio → engine` NO es dependencia: es **proxy de Vite** `/engine → 127.0.0.1:8790` + middleware `serveEngineAssets()`. No hay paquete `ui`/`types` compartido (shadcn y el catálogo de certs están duplicados — ver ARCHITECTURE).

## studio-engine — gotchas que muerden
- **Está trackeado en git** → commitear normal. *(Hasta ~ago-2026 estuvo fuera de git; esa regla ya no aplica.)*
- **Corre sin watch:** todo cambio `.ts` exige **reiniciar**. Arrancar con `node --env-file=.env --import tsx src/index.ts` (NO `npm run start`: deja un hijo `node` sirviendo código viejo). Matar por puerto: `Get-NetTCPConnection -LocalPort 8790 | Stop-Process`.
- **UTF-8** en POSTs y HTML servido. Scripts **PowerShell 5.1 sólo-ASCII** (acentos/em-dash rompen el parseo).
- **Imagen:** `gpt-image` calidad **medium**, 1024x1536. Si están `ENGINE_AZURE_IMAGE_ENDPOINT/_KEY/_MODEL`, **toda** la generación de imagen va al deployment **Azure** (baseURL termina en `/openai/v1`); el texto sigue en OpenAI/Kimi (ruteo por modelo en `openai-client.ts`).
- **Verificar PDFs con `pdf-to-img`** (rasterizador real), NUNCA el visor Chrome `file://`.
- **Dos motores de página**: infografía (image-2 → Visual Atlas) vs composer HTML (formatos de texto). El formato elige; no borrar el composer.
- **Costo:** `GET /engine/cost` es un **estimado interno** (ledger propio), NO el saldo real del proveedor. Verificar saldo real antes de un lote grande.

## Arquitectura de AGENTES (lo que hace único a este repo)
El motor tiene un roster formal, cada agente gobernado por su **contrato**: roster `src/agents/registry.ts`; `src/agents/contracts.ts` **NO es sólo documentación**: `book/route-panel.ts:155` lo lee como **system prompt VIVO** de los 5 expertos LLM del panel, y `agents/agents-rollup.ts:77` lo sirve como doc en `GET /engine/agents`. El mismo objeto cumple los dos roles sin distinción de tipo, así que "actualizar el mirror" de un agente del panel **cambia producción**. Lo cubre `agents/agents.test.ts` (si falta el prompt de un experto, el panel corría con uno menos, en silencio). El prompt *live* de los demás está **inline en su `.ts`**. Sin DAG: pipelines secuenciales por endpoint, instrumentados con `timeAgent`.
- **Grounding Atlas:** Buscador → Autor → Verificador → Supervisor (`src/grounding/*.ts`).
- **Grounding Master:** Psicometrista → Autor doc → Enriquecedor → Verificadores → Supervisor (voz/pedagogía en `src/book/editorial-contract.ts`).
- **Lámina:** Autor-infografía (`image/build-infographic-prompt.ts`) → Ilustrador (`image/generate-upper-visual.ts`) → **Inspector de visión** (`image/infographic-qa.ts`) → Crítico de arte. Look = **`src/contract/design-contract.ts`**.
- **Texto:** `book/sections-gen.ts`, `book/book-generate.ts`, Revisor `qa-editorial.ts`, Editor jefe `book/editor-jefe.ts`.
- **Panel por ruta:** 7 expertos (`book/route-panel.ts`), 2 de ellos linters deterministas (`src/qa/linters.ts`).

**REGLA DE ORO:** cuando un agente produce mal, se **tunea SU contrato** (la string en su `.ts`, o `design-contract.ts` / `editorial-contract.ts`), **no** se re-corre a ciegas ni se parchea el orquestador. Ruteo de modelos: `src/config.ts`.

## Gobernanza de Claude Code (`.claude/`, todo versionado)
- **Skills:** `cloudbooks-book-production` (producir/regenerar/ensamblar un **libro**: pipeline + endpoints + gates + mapa agente→contrato). Para la **landing**: `cloudbooks-design-system`, `landing-evolve`, `ui-design-review`.
- **Subagentes** (`.claude/agents/`, menor privilegio): `engine-reviewer` y `book-qa-auditor` son **solo lectura**; `pipeline-operator` opera el engine por HTTP pero **no edita código ni toca git**.
- **Hooks** (`.claude/settings.json` → `.claude/hooks/*.mjs`): typecheck del engine al editar sus `.ts` (+ recordatorio de restart), **guardia de secretos** que bloquea `git commit` con un `.env` staged, y **bloqueo de `drizzle-kit push`** (empuja esquema a DB viva).

## Convenciones y seguridad
- **pnpm obligatorio** (guard en `preinstall`); `minimumReleaseAge: 1440` como defensa de supply-chain — **no deshabilitar**. TS compartido en `tsconfig.base.json`.
- **Windows** es un camino soportado a mano: `start-dev.ps1` (el workspace strippea binarios nativos win32 a propósito).
- Engine atado a `127.0.0.1`, CORS local, `ENGINE_TOKEN` inyectado por el proxy (nunca entra al bundle), chequeo de path-traversal en `serveEngineAssets()`.
- **Secretos:** `.env` ignorado también desde la raíz (`.env`, `.env.*`, salvo `.env.example`). Nunca commitear claves; si una se expone, **rotarla**.
- **CI en `.github/workflows/ci.yml`**: cada push verifica clonar → `pnpm install --frozen-lockfile` → `typecheck` → build → tests → que no se cuele un `.env`. Clona **sin LFS** a propósito (los binarios sólo se copian como estáticos y así no se quema la cuota mensual de GitHub) y exporta `PORT`/`BASE_PATH`, sin los cuales `vite.config.ts` lanza.
- **Sigue sin ESLint/Prettier.** Tests: **53 casos en 3 archivos** del engine (`engine.test.ts`, `agents/agents.test.ts`, `contract/design-contract.test.ts`), corridos con `node:test` y **aislados en un tmpdir** (`scripts/test-setup.mjs`) para que nunca toquen el estado real. **Cero tests en el frontend** (no hay runner instalado). El CI verifica que *compila*; el comportamiento sólo está cubierto donde hay test.
- **Variables de entorno**: hay un `.env.example` por paquete (`studio-engine`, `studio`, `api-server`, `lib/db`) con los defaults reales. Ojo con las que hacen *throw*: `PORT`/`BASE_PATH` en studio y `DATABASE_URL` en `lib/db` (lanza **al importarse**, no por request).

## Docs: cuáles mienten
`replit.md` está **viejo** (describe otro producto, ni menciona el `studio-engine` ni el puerto 8790) y el `README.md` tiene **rutas absolutas a otra carpeta**. La fuente de verdad es este archivo + `docs/ARCHITECTURE.md` + `.claude/skills/`.

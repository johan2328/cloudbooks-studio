# CloudBooks Studio — Arquitectura

Documento de referencia (no se carga en cada sesión; el resumen operativo vive en `../CLAUDE.md`).
Estado: relevado el 2026-09-04 sobre la rama `homologacion-cloudbooks`.

---

## 1. Árbol de directorios

```
cloudbooks-studio/
├── .claude/                      GOBERNANZA de Claude Code (versionada)
│   ├── skills/                   4 skills (1 de libros + 3 de landing)
│   ├── agents/                   3 subagentes con menor privilegio
│   ├── hooks/                    3 hooks (typecheck, guardia de secretos, bloqueo de db push)
│   └── settings.json             wiring de los hooks
├── artifacts/                    LAS 4 APPS
│   ├── studio-engine/            motor de libros (~18k LOC)
│   │   └── src/ agents/ book/ contract/ grounding/ image/ qa/ render/ skills/
│   ├── studio/                   frontend React+Vite (~34k LOC): cockpit + tienda
│   │   └── public/assets/cloudbooks-engine/   <- SALIDA del engine (1.4 GB) [ver deuda P0]
│   ├── api-server/               backend Express + Drizzle/Postgres (OpenAPI-first)
│   └── mockup-sandbox/           sandbox de mockups
├── lib/                          PAQUETES COMPARTIDOS
│   ├── api-spec/                 openapi.yaml + orval.config.ts  (contrato, fuente de verdad)
│   ├── api-zod/                  esquemas Zod generados
│   ├── api-client-react/         hooks React Query generados
│   └── db/                       esquema Drizzle
├── scripts/                      sync-replit.sh, post-merge.sh, fix-win-natives.ps1
├── docs/                         este archivo + specs del composer
├── CLAUDE.md  README.md(stale)  replit.md(stale)
├── pnpm-workspace.yaml  tsconfig.base.json  .gitattributes(LFS)  start-dev.ps1
```

## 2. Fichas por paquete

| Paquete | package.json | Rol | Entry | Puerto |
|---|---|---|---|---|
| `artifacts/studio-engine` | `@workspace/studio-engine` | motor de libros | `src/index.ts` (tsx) → `src/server.ts` | **8790**, bind `127.0.0.1` |
| `artifacts/studio` | `@workspace/studio` | frontend (cockpit + tienda) | `src/main.tsx` | Vite; **`PORT` obligatorio** (lanza excepción si falta) |
| `artifacts/api-server` | `@workspace/api-server` | backend `/api` | `src/index.ts` → `dist/index.mjs` | 8080 |
| `artifacts/mockup-sandbox` | `@workspace/mockup-sandbox` | sandbox | `src/main.tsx` | Vite |
| `lib/*` | `@workspace/{api-spec,api-zod,api-client-react,db}` | contrato + generados + esquema | — | — |

**Scripts raíz:** `typecheck` (fan-out por paquete), `typecheck:libs` (`tsc --build`), `build`, `sync:replit`. **No hay `dev` en la raíz (a propósito), ni `lint`, ni `test`, ni `format`.**

## 3. Fronteras y acoplamientos

```
studio ────────► @workspace/api-client-react ──(HTTP /api)──► api-server ──► api-zod, db
studio ─ ─ ─ ─ ─(proxy Vite /engine + serveEngineAssets)─ ─ ─► studio-engine   [NO es dep de paquete]
studio-engine ──► (cero deps de workspace)
```

**Olor arquitectónico (raíz de la deuda P0):** el engine **escribe su salida dentro de `artifacts/studio/public/assets/cloudbooks-engine/`**, es decir dentro del árbol servido por el frontend. Eso obliga a `server.watch.ignored` y a un middleware `serveEngineAssets()` a medida en `vite.config.ts`, y arrastra 1.4 GB de artefactos generados al repo.

**Duplicaciones a vigilar:** dos catálogos de certs (engine: 67 canónicas y auto-sincronizadas; storefront: 7 hardcodeadas) · shadcn/ui duplicado entre `studio` y `mockup-sandbox` con Radix ya divergido · dos landings (`landing-v34` y `landing`) y dos demos vivos en el router · conocimiento editorial espejado en `studio/src/domain/editorial-standards/`.

## 4. Producto

**6 formatos** (orden y color fijos, definidos en `studio/src/lib/catalog.ts`, `studio-engine/src/book/storefront.ts` y la skill de design-system): Master Book · Visual Atlas · Exam Traps · Question Bank · Cheat Sheets · Rapid Review, más **Collection Pack**. Productos = `CERTS × (pack + 6 formatos)`.

**Certs:** canon de **67** en `studio-engine/src/certifications.ts` (del póster oficial, auto-refresh mensual vía `cert-sync-scheduler.ts`, persistido en `_certifications.json`), agrupadas en 4 áreas con niveles y estados (Activo/Nuevo/Beta/Sustituida/Retirada). El storefront expone **7** con disponibilidad y ETA.

**Flujo tienda:** `/colecciones` → `/libro/:id` → carrito (React context + **localStorage**) → `/checkout` (**pagos simulados**) → `/mi-biblioteca` (**localStorage**). Las fichas reales salen del engine (`book/storefront.ts`), gated por `ficha.status === "publicado"`. `PAYMENTS_INTEGRATION.md` (sin trackear) documenta lo que falta para pagos de verdad.

## 5. Modelo de estado

- **Stores JSON namespaceados por libro:** `_*.{certId}.{format}.json` bajo `artifacts/studio/public/assets/cloudbooks-engine/` (config del libro, outline, sources, aprobaciones, páginas, capítulos, ledger de costo, runtime de agentes).
- **Escritura atómica:** `fs-safe.ts` (temp + rename) con error logueado, no swallowed.
- **Libro activo:** se fija por **`AsyncLocalStorage`** (`book-context.ts`) al inicio del request — ésta es la protección real contra el "flip" de libro. El `book-lock.ts` es **advisory**, en memoria, TTL 15 min y **lo toma el cliente**, no los endpoints de generación.
- **Idempotencia:** `contentHash` por página/parte (imagen) y cache keys por versión+modelo+corpus (texto).

## 6. Agentes y contratos (dónde tunear)

| Fase / endpoint | Agentes | Contrato (perilla) |
|---|---|---|
| `ground-domain` (Atlas) | Buscador, Autor, Verificador, Supervisor | prompts inline en `grounding/{search-sources,author-page,verify-grounding,relevance-supervisor}.ts`; `CONFIG.authorVersion` bustea el cache del Autor |
| `ground-module` (Master) | Psicometrista, Autor doc, Enriquecedor, Verificadores, Supervisor | inline en `grounding/*.ts`; **voz/pedagogía → `book/editorial-contract.ts`** |
| `infographic-batch` | Autor-infografía, Ilustrador, Inspector de visión | **look → `contract/design-contract.ts`**; grilla/spread → `image/build-infographic-prompt.ts`; re-roll/severidad → `image/infographic-qa.ts` |
| `book-*-generate` | sections-gen, book-generate, Revisor, Editor jefe | inline; umbral del revisor en `qa-editorial.ts` |
| `run-route-panel` | 7 expertos (5 LLM + 2 linters) | **`agents/contracts.ts`** (el panel SÍ lo lee en runtime) + `qa/linters.ts` |

**Observabilidad:** `timeAgent` → `_agent-runtime.json` (cap 10k, con lock + atomic). **El pipeline Atlas no está instrumentado** (el dashboard de Runtime está ciego para `visual-atlas`).

---

## 7. Deuda técnica priorizada

### P0 · Peso del repo y salida dentro del frontend — **plan por fases (diseñado, NO ejecutado)**
Hechos: `.git` ≈ **2.0 GB** (933 MB objetos + 1.1 GB LFS) para ~52k LOC · `artifacts/studio/public` ≈ **1.5 GB**, 852 archivos trackeados bajo `assets/cloudbooks-engine/` · **stores JSON de runtime trackeados como texto** que mutan en cada corrida (`_authored.json` 5.8 MB, `_sources.*` 2.6-3.3 MB) · LFS cubre imágenes/PDF pero no los JSON.

**Inventario (Fase 0, medido):** la **tienda sólo sirve 48 archivos / 76 MB** del store de 1360 MB (**5,6%**). Cuatro cubetas: **A** entregable público (76 MB) · **B** verdad de negocio (`_book-config.*`, outlines, aprobaciones, ledgers de dinero; ~0,4 MB) · **C** estado de runtime regenerable (~35 MB, mutaba en cada corrida) · **D** intermedios de producción (~1,25 GB, **caros de regenerar**: hay que *archivar*, no descartar).

**Hallazgos de producción que reordenan el plan:**
- `serveEngineAssets()` implementa **sólo `configureServer`** → es del **dev server**; en producción no existe.
- `publicDir` no está override → **el build copia todo `public/` a `dist/`**: hoy cada deploy arrastra 1,4 GB.
- El engine bindea `127.0.0.1` y 3 páginas del cockpit dependen de `/engine/*` → **el motor es una herramienta local**, no un servicio desplegado.
- La tienda pública llama al engine sólo para precio/publicado/portada **con `.catch()` → degrada al mock**. `libro.tsx` no hace ningún fetch. En producción sin engine la tienda ya funciona **en modo demo**.

→ **Consecuencia: la vieja "Fase 2" dependía de la vieja "Fase 3".** No se puede mover el working root fuera del árbol servido hasta que exista un paso que deposite ahí el subconjunto entregable. Orden corregido:

1. ✅ **Fase 1 — Congelar el crecimiento (HECHA, commit `8a9e777`).** 34 archivos / 26,8 MB de la cubeta C destrackeados con `git rm --cached` (nada borrado del disco) + `.gitignore` del scratch. Se conservó a propósito lo que codifica decisión humana, negocio o dinero. **No achica el `.git`; frena el sangrado.**
2. ✅ **Fase 2′ — Publicación explícita (HECHA, aditiva).** `publishAssets()` (`src/book/publish-assets.ts`, endpoint `POST /engine/publish-assets`, `{dryRun}`) recorre los `_book-config.*` **con `ficha.status === "publicado"`** y materializa portada + contratapa + muestras + el propio config en `CONFIG.publishRoot`, **espejando la ruta relativa para que ninguna URL cambie**. Hoy `publishRoot === outputRoot` → es no-op y su valor es el **manifiesto** (medido: **42 archivos / 62,9 MB**, con el AI-300 excluido por estar en borrador).
3. ⏳ **Fase 3′ — Mover el working root.** Apuntar `ENGINE_OUTPUT_ROOT` fuera de `artifacts/studio/public/` (ej. `<repo>/.data/engine/`, ignorado), adaptar `serveEngineAssets()` para leer de ahí (conservando el chequeo de path-traversal), quitar el parche `watch.ignored` y correr `publish-assets` para poblar el `public/`. Resultado: `public/` pasa de **1,4 GB a ~63 MB**, el deploy adelgaza y el problema se vuelve **estructuralmente imposible**. Riesgo medio: verificar cockpit y tienda tras el movimiento.
4. ⏳ **Archivar la cubeta D** (1,25 GB) fuera de git antes de ignorarla — **son láminas que costaron dinero**; ignorarlas sin archivarlas expone a perderlas con un `git clean`.
5. 🔵 **Reescribir la historia (opcional, decisión aparte).** `git filter-repo`/BFG achicaría el `.git`, pero **reescribe hashes**: exige repo quieto, acuerdo explícito y mirror de backup. **Recomendación: no hacerlo por estética** — clonar con `--filter=blob:none` o `--depth` resuelve el 90% del dolor sin cirugía.

### P1 · Rigor de la arquitectura de IA
Los tres bugs P0 de los gates ya fueron corregidos (QA de imagen que fallaba **abierto**, verificador que fallaba **cerrado** sin assert de cobertura, y supervisor cuyo error se registraba como veredicto "thin"). **Queda pendiente:**
- **Sin validación de esquema** en ninguna respuesta LLM (~28 sitios usan JSON-mode, 0 usan json_schema/zod); truncamiento (`finish_reason==="length"`) guardado en sólo 6 de ~35 sitios.
- **Sin reintentos/backoff en ningún agente de texto** (0 de ~35) — el path de imagen sí los tiene y sirve de patrón.
- **Tests:** 1 archivo para 18k LOC. Sin cobertura: `qa/linters.ts` (los 2 linters deterministas que reemplazaron jueces LLM), `aggregatePanel`/`normalizeVerdict` (deciden ship/revise/block de una ruta entera), `costBreakdown`.
- **Sin harness de evals**: no hay fixtures de respuestas reales ni serie temporal por `(agente, promptVersion, modelo)` → **"qué agente regresionó" es incontestable** (`okRate` mide si tiró excepción, no calidad).
- **Contratos:** `contracts.ts` driftea de los prompts inline (drift confirmado en el gate de fidelidad) y ~⅔ de los prompts no tienen versión ni changelog. Fix estructural: invertir la dependencia (que cada agente **importe** su prompt de `contracts.ts`, como ya hace el panel).
- **Costo:** 11 labels emitidos no están en el `registry` → su gasto se pierde de la atribución por agente (incluidos `enrich-chapter`/`enrich-repair`, los más caros del Master). El ledger no tiene cap ni rotación y se reescribe entero en cada llamada.
- **Concurrencia:** read-modify-write **sin lock** en todos los record stores, incluido el ledger de costo (el patrón correcto ya existe en `agents/agent-runtime.ts`). Sin `schemaVersion` en ningún store, y un store ilegible se lee como **vacío** en silencio.

### P2 · Estándares ausentes
Sin CI (`.github/` no existe) · sin ESLint/Prettier configurado (Prettier está instalado pero sin config ni script; hay `eslint-disable` muertos) · sin `.editorconfig` ni `.nvmrc` · **1 test** en todo el repo · licencia contradictoria (`package.json` dice MIT, el README dice privado) · sin `CONTRIBUTING.md`.

### P3 · Higiene y duplicación
329 entradas sin trackear en `git status` (19 `_poc-*.ts` sueltos en `src/` del engine, scripts one-off en la raíz del paquete, backups fechados, `validation-kit/` de **179 MB**) · dos catálogos de certs · shadcn duplicado · dos landings y dos demos vivos (~1.700 líneas casi duplicadas) · precios inconsistentes entre `catalog.ts` y `ai200-packs.tsx` · god-files (`estudio-indesign.tsx` 7.400 líneas, `server.ts` 1.686) · `attached_assets/` con 41 archivos trackeados de 0 bytes aliasados como `@assets` · glob muerto `lib/integrations/*` · directorio huérfano `studio/public/assets/cloudbooks/` en la raíz.

---

## 8. Lo que YA está bien (no regresionar)
Escrituras atómicas con error real · `AsyncLocalStorage` para fijar libro y contexto de corrida (primitiva correcta, bien motivada) · normalización defensiva y **mediana-de-N** en el panel de expertos · **linters deterministas** reemplazando jueces LLM ruidosos · taxonomía de errores + backoff en el path de imagen · **verificador de práctica con modelo distinto al autor** (evita auto-calificación) · idempotencia por `contentHash` · guard de supply-chain `minimumReleaseAge` + guard de pnpm en `preinstall` · engine en `127.0.0.1` con CORS local, `ENGINE_TOKEN` fuera del bundle y chequeo de path-traversal · Git LFS bien scopeado para los binarios de libro · `.claude/` versionado (skills, agentes y hooks viajan con el código).

---
name: cloudbooks-book-production
description: >-
  Pipeline reproducible para PRODUCIR un libro de certificación por el motor CloudBooks (studio-engine, /engine/*):
  Visual Atlas (una skill = una lámina gpt-image) o Master Book (capítulos). Encapsula el orden de fases, los
  endpoints, los gates anti-regresión y la verificación. Úsalo SIEMPRE que se vaya a producir/onboardear/regenerar
  un libro o corregir su ensamblado. Trigger: "producir libro", "correr por cloudbooks", "nuevo Visual Atlas",
  "nuevo Master Book", "onboardear cert", "regenerar láminas", "ensamblar el libro", "portadillas/portada del libro".
  NO es para la landing (para eso están cloudbooks-design-system / landing-evolve / ui-design-review).
---

# CloudBooks — Producción de libros (pipeline anti-regresión)

Motor: `artifacts/studio-engine` (tsx, puerto **8790**, 100% **untracked** → cambios `.ts` = `typecheck` + **restart** con `node --env-file=.env --import tsx src/index.ts`, matar por PID del 8790). Frontend Vite en `artifacts/studio` (5173). Assets bajo `artifacts/studio/public/assets/cloudbooks-engine/`. Stores namespaceados por **cert+formato** (`_*.{certId}.{format}.json`). Los porqués/gotchas históricos están en la memoria **[[cloudbooks-book-pipeline]]** (gates G0-G8) — este skill es el procedimiento; esa memoria es la casuística.

## Regla de oro
"verified"/"listo" **NO es un sello**: una fase sólo se cierra con **muestra rasterizada real** (pdf-to-img) que pasa el checklist visual. Nada de PNG crudo ni visor Chrome `file://`.

## Los 5 gotchas que causan retrabajo (memorizar)
1. **Lock de corrida:** toda la producción corre con `library/lock` tomado; verificar `_active-book.json` = cert/format esperado antes de generar assets (hazard de flip por otro tab).
2. **Master-first ×2:** el **style-anchor** (láminas) y los **route-dividers** se siembran/generan **maestro primero**; si generás en orden de ruta, p1/p2 salen sin ancla y copian la PORTADA (marco/estilo ajeno). Dividers → SIEMPRE por el batch `route-dividers/generate-all`.
3. **Persistir-y-guardar:** `book-generate` y `book-section/generate` deben **persistir** (ya lo hacen server-side, pero sólo si `r.ok`); si un bloque no se regenera, el ensamblado usa el **default de otro cert** → sangrado.
4. **Route-locks (423):** una ruta groundeada y bloqueada rechaza el re-ground completo; sólo re-runs puntuales por `skillIds`.
5. **design-lock pre-assemble:** si aprobaste piezas en Auto Pages sin bloquear el diseño, `assemble-book` se niega.

## Modelo de dos capas (agentes del engine vs este skill)
Este skill es el **orquestador externo** (Claude Code): decide qué `/engine/*` llamar, en qué orden, con qué gates. Los **agentes del engine** (Buscador, Autor, Verificador, Supervisor, Inspector de visión, Editor jefe, Panel de 7…) corren **server-side** cuando pegás a un endpoint, cada uno gobernado por su **contrato** (string inline en su `.ts`, o `design-contract.ts` / `editorial-contract.ts`; el panel lee `agents/contracts.ts` en runtime). **El agente NO llama al skill; el skill maneja a los agentes.** → Nunca dupliques ni pises un contrato desde acá; cuando un agente produce mal, **tuneá SU contrato** (no un re-run ciego). Roster en `src/agents/registry.ts`.

### Mapa fase → agente → contrato → perilla
| Fase / endpoint | Agente(s) | Contrato (dónde tunear) |
|---|---|---|
| `ground-domain` (Atlas) | Buscador / Autor / Verificador / Supervisor | inline en `grounding/{search-sources,author-page,verify-grounding,relevance-supervisor}.ts`; `CONFIG.authorVersion` bustea el cache del Autor |
| `ground-module` (Master) | Psicometrista / Autor doc / Enriquecedor / Verificadores / Supervisor | inline en `grounding/*.ts`; **voz/pedagogía → `book/editorial-contract.ts`** (NO editar el .ts del autor) |
| `infographic-batch` / `generate-infographic` | Autor-infografía / Ilustrador / **Inspector de visión** | **look → `contract/design-contract.ts`** (`AI200_COLLECTION`: canvas/palette/iconografía/cards/traps/autocheck); layout/grid/spread → `image/build-infographic-prompt.ts` + `CONFIG.spreadMinModules`; **re-roll/severidad → `image/infographic-qa.ts`** |
| `book-section/generate`, `book-generate` | sections-gen / book-generate / Revisor editorial | inline; verdict/umbral → `qa-editorial.ts` |
| `book-review` | Editor jefe | `book/editor-jefe.ts` |
| `run-route-panel` / `regenerate-route` | Panel de 7 (editor, tipografía, engagement, instr-design, exam-align, +2 linters) | **`agents/contracts.ts`** (panel-*) + umbrales `route-panel.ts`; linters deterministas → `qa/linters.ts` |
| cualquiera | ruteo de modelos | `src/config.ts` (`authorModel/qaModel/visionModel/imageModel/...`, `.env`) |

**Ojo:** el contrato *live* de grounding/imagen/editorial es **inline** en cada `.ts`; `agents/contracts.ts` es un **mirror de doc que puede driftear** — salvo el panel, que sí lo consume en runtime.

### Hueco conocido de QA (a cerrar en su ronda)
El **Inspector de visión** solo detecta `garbled` (garabato), NO ortografía/gramática/palabras-cortadas → una palabra legible pero mal escrita **pasa** y llega al PDF (láminas = texto horneado → solo se corrige regenerando). El front-matter no tiene revisor. Fix pendiente = campo de ortografía en `infographic-qa.ts` (→ re-roll) + pase revisor de texto estilo `editor-jefe.ts`.

## Fases y endpoints (en orden)

### G0 · Onboarding (barato, sin imagen)
- `POST /engine/library/activate {certId, bookId}` + `POST /engine/library/lock {holder}`. Verificar `_active-book.json`.
- **Outline** (el crux): `POST /engine/outline {certId, outline:{domains[...skills{id,title,objectives,moduleId,kind,url}]}}`. Verificar `GET /engine/outline?certId=`.
- Paleta del libro: `POST /engine/book-config {style:{bg,accent,accent2,...}}` (chrome del cert; el CUERPO de la lámina va azul Azure por contrato — no cambiar sin decisión explícita).
- **Re-sembrar el design-anchor AL CERT nuevo** (nunca heredar el del libro anterior; el store es per-cert): se hace tras tener una lámina aprobada (G2).

### G1 · Sourcing (barato)
- Las `url` del outline se auto-ingestan. Buffer-2: `POST /engine/extra-sources {certId, map:{skillId:[urls]}}` (UTF-8 bytes). Búsqueda MS Learn: `POST /engine/search-sources {skillId, allowMsLearnSearch:true}` (lento ~45s/skill → correr per-dominio o en background, resumable).
- **Meta:** cada skill con ≥1 fuente real antes de groundear.

### G2 · Grounding (LLM texto; gate de 4 agentes)
- `POST /engine/ground-domain {domainId, allowMsLearnSearch:true}` por dominio (largo → background). Verificar `GET /engine/grounding-tree?certId=` → `groundingStatus:"verified"`/`partial` con `pageIds`. (No confíes en el "blocked" del log: el supervisor marca `thin`, que para lámina concisa es aceptable.)

### G3 · Láminas (gpt-image — GASTO REAL, gate de precio)
- **Pre-flight de costo:** `GET /engine/cost` es ESTIMADO interno, NO el saldo real de OpenAI/Azure. Verificar saldo real antes de un batch grande. Fallo en **bloque contiguo** = límite externo (429), no contenido → diagnosticar 1 página capturando `res.error`; NO reintentar a ciegas.
- `POST /engine/infographic-batch {pageIds, force}` en **tandas de ~10-12** (attempts:1 sin reintento; re-correr sólo fallidos con `force`).
- **Piloto A/B primero:** generar 3-4 láminas y verificar estilo/paleta/título antes del lote completo.
- Sembrar anchor: aprobar una lámina limpia → fijarla como master (`style-anchor`) → regenerar el resto anclado.
- **Spreads (A/B):** B recibe la imagen de A como 2ª referencia (código ya lo hace) → título mismo peso, sin marco. El contrato prohíbe marco exterior.

### G4 · Verificación de láminas (gate de calidad)
Rasterizar muestras con **pdf-to-img** (script `raster2.mjs`). Checklist: (a) banda header presente, (b) margen seguro, (c) **título completo** (sin recortar), (d) sin celdas vacías, (e) **sin marco exterior** que envuelva las tarjetas, (f) colores pactados (cuerpo azul + chrome de marca). Spread: título de B con el mismo peso/tamaño que A.

### G5 · Front-matter (LLM texto — PERSISTE server-side)
- `POST /engine/book-section/generate {section}` para `studyGuide|glossary|domainMap|scenarioReview` (persisten).
- `POST /engine/book-generate {section}` para `preface|intro|conclusions|backcover|collectionNote|domainNote|domainRows` (persisten).
- `POST /engine/route-intro/generate {domainId}` por ruta.
- **Cert-clean gate:** `GET /engine/book-config` → ningún `blocks.*` contiene un código de cert ajeno (ej. "AI-200" en un libro AI-300 = sangrado). La banda de copyright se deriva del cert activo en `assemble-book` (no del string persistido).

### G6 · Portadillas + portada (gpt-image — Azure)
- **Portadillas:** `POST /engine/route-dividers/generate-all {force}` (maestro p3 primero → resto anclado). Verificar manifiestos `route-intro-p*.divider.json` con `"anchored":true` (salvo el maestro).
- **Portada:** `POST /engine/book-cover/generate {force, count:2-3}` → elegir con `POST /engine/book-cover/select {take:"<archivo>.png"}`. (Contratapa: `book-backcover/*`.)

### G7 · Ficha + ensamblado
- `POST /engine/book-ficha/generate {parts:["copy","toc","samples"]}`.
- **Aprobar** las láminas: `POST /engine/approve-pages {pageIds, approved:true}` (assemble se niega sin páginas aprobadas).
- (Si hubo Auto Pages) `POST /engine/design-lock`.
- `POST /engine/assemble-book` → PDF `_export/{CERT}_libro.pdf` + persiste `ficha.pages`. Verificar `pages`/`laminas` + secciones. Entregar: si >30 MB, partir con pdf-lib para `SendUserFile`.

### Fase 4 · Publicar + subir (SOLO al decir "terminado")
- `POST /engine/book-config {ficha:{status:"publicado"}}`; ISBN + precio reales. Catálogo frontend (`catalog.ts`/`data.ts`). `git add` de `ai-300/**` + `_*.{cert}.*` + PDF + fixes de engine, commit + push (LFS). Actualizar la memoria del pipeline.

## Restricciones duras
- gpt-image en `medium`, 1024×1536 — inalterable.
- No tocar el **contrato de color** (cuerpo azul Azure + chrome de marca) sin decisión explícita del usuario.
- POSTs con acentos → **bytes UTF-8**.
- Antes de tocar código compartido del engine (contract, config), **backup** + `typecheck` exit 0 + restart.
- El motor está fuera de git → no commitear suelto; reiniciar con `node --env-file=.env --import tsx` (npm deja hijo viejo).

## Contra-check al terminar cada libro
`grep` en `_book-config.{cert}.{format}.json` → sin códigos de cert ajenos en `blocks/collection/domainMap/backCover`; dividers `anchored:true`; ficha `pages` real; muestra rasterizada por G4. Si algo falla, es uno de los 5 gotchas.

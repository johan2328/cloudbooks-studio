# CloudBooks Studio — manual del proyecto (para la IA)

Monorepo que genera **libros de certificación** (Visual Atlas / Master Book) + la landing comercial. Español neutro LATAM.

## Dos backends (NO confundir)
- **`artifacts/api-server`** — Express 5, puerto **8080**, `/api`, OpenAPI-first + Drizzle/Postgres. (Es lo que documenta `replit.md`.)
- **`artifacts/studio-engine`** — el **motor de libros** real, puerto **8790**, rutas `/engine/*`, corre con **tsx**. El front (`artifacts/studio`, React+Vite) lo alcanza por proxy `/engine/*`. `replit.md` NO lo menciona (está viejo).

## studio-engine — gotchas que importan
- **Está en git** (trackeado). Commitear cambios normal. *(Nota histórica: hasta ~ago-2026 estaba untracked; ya no.)*
- **Sin watch:** para aplicar cambios `.ts` hay que **reiniciar**. Arrancar con `node --env-file=.env --import tsx src/index.ts` (NO `npm run start`, deja un hijo `node` viejo sirviendo código previo). Matar por puerto: `Get-NetTCPConnection -LocalPort 8790 | Stop-Process`.
- **UTF-8** en POSTs y HTML servido (`<meta charset=utf-8>`). Scripts **PowerShell 5.1 sólo-ASCII** (acentos/em-dash rompen el parseo).
- **Imagen** = `gpt-image` (image-2), calidad **medium**. Si `ENGINE_AZURE_IMAGE_ENDPOINT`+`_KEY`+`_MODEL` están seteados, TODA la generación de imagen va al deployment **Azure** (baseURL termina en `/openai/v1`); el texto sigue en OpenAI/Kimi (ruteo por modelo en `openai-client.ts`).
- **Verificar PDF** con **pdf-to-img** (rasterizador real), NUNCA el visor Chrome `file://` (no determinista).
- **Dos motores de página** dentro del engine: infografía (image-2, Visual Atlas) vs composer HTML (formatos de texto) — el formato elige; no borrar el composer.

## Arquitectura de AGENTES (clave)
El engine tiene un roster formal de agentes, cada uno **gobernado por su CONTRATO**: roster en `src/agents/registry.ts`, contratos-doc en `src/agents/contracts.ts` (mirror; el **panel de expertos** SÍ lo lee en runtime, el resto tiene el prompt **inline** en su `.ts`). Sin DAG: pipelines secuenciales por-endpoint bajo `book-lock`, instrumentados con `timeAgent`.
- Grounding Atlas: Buscador → Autor → Verificador → Supervisor (`grounding/*.ts`).
- Grounding Master: Psicometrista → Autor doc → Enriquecedor → Verificadores → Supervisor (voz en `book/editorial-contract.ts`).
- Lámina: Autor-infografía (`image/build-infographic-prompt.ts`) → Ilustrador (`image/generate-upper-visual.ts`) → **Inspector de visión** (`image/infographic-qa.ts`) → Crítico de arte. Look = **`contract/design-contract.ts`**.
- Texto/front-matter: `book/sections-gen.ts`, `book/book-generate.ts`, Revisor `qa-editorial.ts`, Editor jefe `book/editor-jefe.ts`.
- Panel por-ruta: 7 expertos (`book/route-panel.ts` + `agents/contracts.ts`).

**Regla de oro:** cuando un agente produce mal, se **tunea SU contrato** (la string en su `.ts`, o `design-contract.ts` / `editorial-contract.ts`), no se re-corre a ciegas ni se parchea el orquestador. Ruteo de modelos: `src/config.ts` (`authorModel/qaModel/visionModel/imageModel/...`, `.env`-overridable).

## Skills (`.claude/skills/`)
- **`cloudbooks-book-production`** — producir/regenerar/ensamblar un **libro** por el engine (pipeline + endpoints + gotchas + mapa agente→contrato). Úsalo para libros.
- **`cloudbooks-design-system`**, **`landing-evolve`**, **`ui-design-review`** — para la **landing / sitio comercial**, no para libros.

## Memoria / specs
La casuística anti-regresión de producción de libros (gates G0-G8: master-first, persistir-y-guardar, cert-clean, sin marco, etc.) vive en la memoria personal `cloudbooks-book-pipeline` y se destila en el skill de producción. Este CLAUDE.md es la **arquitectura durable**; la memoria son los **porqués/gotchas** por corrida.

## Arranque (dev)
`pnpm --filter @workspace/api-server run dev` (8080) · `pnpm --filter @workspace/studio run dev` (Vite) · engine: ver gotcha de restart arriba. `pnpm run dev` en la raíz NO existe (a propósito).

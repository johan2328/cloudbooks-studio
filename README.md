# AI-200 Production Studio

Consola editorial full-stack para un equipo de 4 personas que produce el libro de infografías de certificación Microsoft AI-200. Interfaz 100% en español.

![Stack](https://img.shields.io/badge/stack-Node.js%2024%20%2B%20React%20%2B%20PostgreSQL-blue)
![License](https://img.shields.io/badge/license-privado-gray)

---

## Qué es esto

**AI-200 Production Studio** es una herramienta interna de producción editorial para generar, revisar y aprobar las 61 infografías del libro de estudio de certificación Microsoft AI-200. Cada infografía sigue el estándar **Visual Atlas v24** — un golden master de 768×1152px con layout determinístico, generación de imagen vía OpenAI, y QA automatizado de 14 dimensiones estructurales.

El flujo editorial es:

```
Biblioteca → Contenido/Grounding → Generación → QA y Aprobación → Exportación
```

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Runtime | Node.js 24, TypeScript 5.9 |
| Backend | Express 5, Drizzle ORM, PostgreSQL |
| Frontend | React + Vite + Wouter + TanStack Query + shadcn/ui + Tailwind CSS |
| Validación | Zod v4, drizzle-zod |
| API contract | OpenAPI 3.1 → Orval (codegen de hooks + schemas) |
| Generación IA | gpt-4o-mini (texto) + gpt-image-2 medium (imagen) |
| Monorepo | pnpm workspaces |

---

## Estructura del proyecto

```
artifacts/
  api-server/src/
    app.ts                        — Express app, monta router en /api
    config/generation.ts          — Modelos y guardrails (gpt-4o-mini, gpt-image-2 medium)
    data/page-seeds/              — Seeds de contenido editorial por página
    routes/
      auth.ts                     — POST /auth/login, GET /auth/me, POST /auth/logout
      pages.ts                    — CRUD de páginas, aprobación, revisión, stats, batches
      qa.ts                       — GET/PUT /qa/:pageId
      generation.ts               — GET/POST /generation/runs (legacy CRUD)
      studio-generate.ts          — POST /studio/generate/:pageId (Visual Atlas pipeline)
      studio-approval.ts          — POST /studio/approve-page/:pageId
      studio-qa.ts                — GET /studio/qa-report/:pageId
      studio-status.ts            — GET /studio/output-status/:pageId, seed-status/:pageId
    services/
      export/                     — paths.ts, output-status.ts
      generation/visual-atlas/    — build-image-prompt, generate-upper-visual, orchestrator
      qa/                         — approval-gate.ts, visual-atlas/validate-page-html.ts
      renderers/visual-atlas/     — render-golden-page.ts (golden master 768×1152)
  studio/src/
    pages/
      login.tsx                   — Selección de perfil + PIN
      biblioteca.tsx              — Grid de 61 infografías con filtros
      contenido.tsx               — Formulario de Contenido y Grounding por página
      generacion.tsx              — Disparar generación OpenAI, historial de corridas
      qa.tsx                      — Panel QA, vista previa, aprobar/rechazar
      exportacion.tsx             — Tabla de páginas aprobadas con acciones por formato
      contrato.tsx                — Contrato Visual (reglas no negociables / flexibles)
    domain/editorial-standards/   — Estándares editoriales del Visual Atlas v24
lib/
  api-spec/openapi.yaml           — Fuente de verdad del contrato API
  api-client-react/               — Hooks React Query generados por Orval
  api-zod/                        — Schemas Zod generados por Orval
  db/                             — Esquema Drizzle ORM
```

---

## Requisitos

- Node.js 24+
- pnpm 9+
- PostgreSQL (se puede usar Replit DB o cualquier instancia)
- Variables de entorno:

```env
DATABASE_URL=postgres://...       # Requerido
OPENAI_API_KEY=sk-...             # Opcional — sin él corre en modo demo
SESSION_SECRET=...                # Requerido para sesiones
```

---

## Instalación y desarrollo

```bash
# Instalar dependencias
pnpm install

# Push del esquema de base de datos
pnpm --filter @workspace/db run push

# Arrancar API server (puerto 8080)
pnpm --filter @workspace/api-server run dev

# Arrancar frontend (puerto 18425)
pnpm --filter @workspace/studio run dev
```

> En Replit, los workflows arrancan ambos servidores automáticamente.

---

## Comandos útiles

```bash
# Typecheck completo
pnpm run typecheck

# Build de todos los paquetes
pnpm run build

# Regenerar hooks y schemas desde la spec OpenAPI
pnpm --filter @workspace/api-spec run codegen
```

---

## Flujo de producción de una infografía

### 1. Biblioteca
Vista general de las 61 páginas con filtros por batch (1–13), estado y dominio.

### 2. Contenido y Grounding
Formulario editorial por página: contexto, conceptos clave, trampas de examen, autocheck y fuentes.

### 3. Generación
Dispara el pipeline Visual Atlas:
- **Texto**: gpt-4o-mini genera el contenido estructurado
- **Imagen**: gpt-image-2 medium genera el upper visual (728×494px)
- **Render**: golden master 768×1152px ensamblado deterministicamente
- **QA estructural**: 14 checks automáticos (dimensiones, colores, secciones)

### 4. QA y Aprobación
Panel de diagnóstico con 6 dimensiones de score:
- Dirección de arte · Consistencia editorial · Legibilidad
- Precisión técnica · Densidad útil · Riesgo comercial

El gate de aprobación bloquea si el upper visual no es imagen real (`generationMode !== "openai_image"`). La aprobación final requiere revisión visual humana.

### 5. Exportación
Tabla de páginas aprobadas con acceso a `page.html`, metadata y QA report.

### 6. Contrato Visual
Reglas editoriales no negociables del Visual Atlas v24: colores, tipografía, layout, changelog.

---

## Arquitectura y decisiones

- **Auth demo**: token `demo-token-{userId}` en localStorage, pasado via `Authorization: Bearer`. No JWT real — equipo interno de 4 personas.
- **OpenAPI-first**: toda la superficie de la API definida en `openapi.yaml` antes de implementar. Hooks y schemas se regeneran con `codegen`.
- **Generación server-side**: llamadas a OpenAI solo desde el servidor. Sin `OPENAI_API_KEY` corre en modo demo con contenido placeholder.
- **Guardrail de costos**: `gpt-image-2 medium` únicamente. `ALLOW_HIGH_QUALITY=false` hardcodeado en `config/generation.ts`.
- **Golden master determinístico**: el renderer HTML no depende de IA — solo ensambla el output de texto e imagen según el template v24.
- **QA desnormalizado**: `qaScore` en la tabla `pages` se actualiza en cada upsert de QA para queries de lista rápidas.

---

## Producto

61 infografías organizadas en 13 batches cubriendo los dominios del examen AI-200:
- Soluciones contenerizadas en Azure
- Servicios cognitivos y Computer Vision
- Procesamiento de lenguaje natural
- Búsqueda e indexación inteligente
- Servicios de voz y traducción
- Decisión e IA responsable
- *(y 7 dominios más)*

---

## Tema visual

- Fondo: `#edf2f8` (editorial, no dark dashboard)
- Acento teal: `#0d9488`
- Topbar/footer navy: `#061B49`
- Radio: `0.3rem`
- Densidad alta — herramienta profesional

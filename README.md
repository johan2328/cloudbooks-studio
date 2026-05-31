# AI-200 Production Studio

Consola editorial full-stack para un equipo pequeno que produce el libro **Visual Atlas** de certificacion Microsoft AI-200.

![Stack](https://img.shields.io/badge/stack-Node.js%2024%20%2B%20React%20%2B%20PostgreSQL-blue)
![License](https://img.shields.io/badge/license-privado-gray)

---

## Estado actual del sistema (mayo 2026)

### Lo que ya esta estable
- Pipeline end-to-end `Contenido -> Generacion -> QA -> Exportacion`.
- Renderer HTML deterministico (Golden Master) para pagina 768x1152.
- Guardrail de costo activo (`gpt-image-2` en `medium`).
- Deteccion de output viejo vs renderer actual mediante `layoutRevision`.
- Flujo de sincronizacion Replit simplificado con `pnpm sync:replit`.

### Lo que esta en evolucion activa
- Calidad compositiva del bloque visual superior (menos aire muerto, mayor ocupacion util).
- Compactacion del rail inferior (`Trampas + Autocheck`) para evitar huecos.
- Composer editorial (hoy en modo propuesta asistida, no editor drag-and-drop final).

### Lo que aun no esta terminado
- Composer visual con arrastrar/soltar bloques.
- Regeneracion puntual por bloque (no solo regeneracion completa de pagina).
- Persistencia server-side de todas las notas manuales del editor en Composer.

---

## Que es esto

**AI-200 Production Studio** es una herramienta interna para producir 61 infografias del formato Visual Atlas.  
Cada salida combina:
- contenido estructurado,
- imagen superior generada,
- ensamblado HTML deterministico,
- y QA editorial con gate de aprobacion.

Flujo editorial:

```text
Biblioteca -> Contenido/Grounding -> Generacion -> QA y Aprobacion -> Exportacion
```

---

## Stack

| Capa | Tecnologia |
|------|------------|
| Runtime | Node.js 24, TypeScript 5.9 |
| Backend | Express 5, Drizzle ORM, PostgreSQL |
| Frontend | React + Vite + Wouter + TanStack Query + Tailwind |
| Validacion | Zod v4 |
| API contract | OpenAPI 3.1 + Orval |
| IA | `gpt-4o-mini` (texto), `gpt-image-2` medium (imagen) |
| Monorepo | pnpm workspaces |

---

## Estructura del proyecto

```text
artifacts/
  api-server/src/
    config/generation.ts
    data/page-seeds/
    domain/editorial-contracts/visual-atlas-v24.ts
    domain/composer/
    routes/
      studio-generate.ts
      studio-qa.ts
      studio-approval.ts
      studio-status.ts
      studio-composer.ts
    services/
      generation/visual-atlas/
      renderers/visual-atlas/render-golden-page.ts
      qa/
      export/
  studio/src/
    pages/
      biblioteca.tsx
      contenido.tsx
      generacion.tsx
      qa.tsx
      composer.tsx
      exportacion.tsx
lib/
  api-spec/openapi.yaml
  api-client-react/
  api-zod/
  db/
```

---

## Requisitos

- Node.js 24+
- pnpm 9+
- PostgreSQL

Variables de entorno:

```env
DATABASE_URL=postgres://...       # requerido
OPENAI_API_KEY=sk-...             # recomendado para salida real (sin key usa fallback)
SESSION_SECRET=...                # requerido
```

---

## Instalacion y desarrollo

```bash
pnpm install
pnpm --filter @workspace/db run push
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/studio run dev
```

---

## Operacion en Replit (sin depender del agente)

```bash
pnpm sync:replit
```

Este comando:
- sincroniza `origin/main`,
- instala dependencias,
- ejecuta `db push`,
- y deja runtime alineado al SHA remoto.

Recomendaciones operativas:
- guardar secretos solo en `Secrets` de Replit (no en `.replit`);
- verificar SHA activo en Dashboard;
- si cambias renderer/contrato, regenerar pagina para ver el efecto.

---

## Visual Atlas v24 (estado compositivo)

### Base actual
- Hero + Context + Pregunta guia en HTML fijo.
- Upper visual generado por IA e insertado como asset.
- Rail inferior de examen en HTML.

### Problema historico que estamos resolviendo
- margen excesivo dentro del upper visual (la composicion se ve pequena);
- rail inferior sobredimensionado para contenido corto;
- monotonia de composicion entre paginas.

### Cambios recientes aplicados
- ajuste de `slotWidth/slotHeight` del upper visual;
- prompt mas estricto para evitar "marco poster" y aire excesivo;
- compactacion adicional de tipografia y spacing en rail inferior;
- deteccion de output desactualizado por `layoutRevision`.

---

## Composer editorial (estado real)

### Hoy
- Vista `Composer` disponible en Studio.
- Propuesta de bloques por pagina (familia compositiva + cobertura + score).
- Fallback local si la ruta API de Composer no esta disponible en el runtime.
- Nueva lectura de huella espacial:
  - % apertura,
  - % cuerpo visual,
  - % rail inferior,
  - recomendacion operativa.
- Mini wireframe para lectura rapida de balance.

### Proximo objetivo (prioritario)
1. Composer interactivo drag-and-drop.
2. Regeneracion puntual por bloque.
3. Grounding puntual por bloque/tema (sin rerun global cada generacion).
4. Persistencia completa de acciones editoriales en backend.

---

## Politica de grounding recomendada

No ejecutar grounding completo en cada generacion.

Estrategia:
1. Fuente base curada (`CSV` o `Sheet`) por tema.
2. Grounding puntual por tema cuando se necesita.
3. TTL editorial sugerido de 7 dias.
4. Regeneracion de pagina usa grounding vigente.
5. Refresco forzado solo si:
   - cambio de fuente,
   - expiracion de TTL,
   - o decision editorial.

---

## QA y aprobacion

Dimensiones de score:
- Direccion de arte
- Consistencia editorial
- Legibilidad
- Precision tecnica
- Densidad util
- Seguridad comercial

Meta operativa actual:
- cerrar brecha hacia `9.5` en score editorial total para salida de produccion por lote.

---

## Comandos utiles

```bash
pnpm run typecheck
pnpm run build
pnpm --filter @workspace/api-spec run codegen
```

---

## Documentacion de diseno

- [docs/editorial-composer-spec.md](/C:/Users/jguerra/OneDrive%20-%20Datco%20S.A/Documentos/Editorial%20IA/cloudbooks-studio/docs/editorial-composer-spec.md)
- [docs/editorial-composer-transition-and-red-team.md](/C:/Users/jguerra/OneDrive%20-%20Datco%20S.A/Documentos/Editorial%20IA/cloudbooks-studio/docs/editorial-composer-transition-and-red-team.md)

---

## Nota sobre "parches"

En este repo, un "parche" no significa atajo oculto ni fix desordenado por fuera del contrato.  
Significa cambio pequeno y controlado en:
- contrato visual,
- renderer,
- o UI de operacion,
con commit trazable y validacion de impacto.

Cuando un cambio no es estructuralmente sano, no se considera parche valido: se mueve a roadmap de arquitectura.

# CloudBooks Studio

CloudBooks Studio es la plataforma editorial interna para construir y operar una biblioteca de estudio por certificacion cloud.

Objetivo de negocio:
- producir colecciones premium de preparacion tecnica;
- acelerar comprension + retencion para examen;
- escalar el mismo metodo editorial a multiples clouds y certificaciones.

![Stack](https://img.shields.io/badge/stack-Node.js%2024%20%2B%20React%20%2B%20PostgreSQL-blue)
![License](https://img.shields.io/badge/license-privado-gray)

---

## Vision del producto

CloudBooks no es un generador aislado de infografias. Es una fabrica editorial con trazabilidad para construir colecciones completas.

Ruta de uso esperada:
1. Biblioteca -> elegir cloud.
2. Cloud -> elegir certificacion.
3. Certificacion -> operar sus formatos.

Formatos por certificacion:
- Master Book
- Visual Atlas
- Exam Traps Guide
- Question Bank
- Cheat Sheets
- Rapid Review Pack

---

## Estado real (mayo 2026)

Lo estable hoy:
- pipeline `Contenido -> Generacion -> QA -> Exportacion`;
- renderer deterministico para pagina 768x1152;
- guardrail de costo (`gpt-image-2` en `medium`);
- deteccion de output desactualizado por `layoutRevision`;
- sync operativo en Replit con `pnpm sync:replit`.

Lo prioritario en curso:
- Composer util para cerrar brecha al 9.5 con baseline real;
- control fino del balance visual (menos marco, menos aire muerto, mejor densidad util);
- regeneracion dirigida desde Composer por alcance (`full`, `technical_core`, `exam_rail`);
- crecimiento modular del sistema a mas certificaciones cloud.

Sprint 1 (fuente unica + control operativo) en avance:
- semaforo operativo en Dashboard (`oficial`, `pendiente consolidar`, `sin QA`);
- KPI `tiempo a aprobable` desde bitacora persistente;
- gate de lote Batch 01 con criterio QA >= 9.5 + visual real.

Sprint 2 (Composer accionable) en avance:
- presets compositivos aplicables en un clic;
- flujo rapido `preset -> generar -> QA`;
- receta aplicada persistida en bitacora (`composer_action`) para reproducibilidad por pagina.

Sprint 3 (Composer operativo + alineacion QA) en avance:
- panel de alineacion QA/Composer con fuente activa explicita (`QA servidor` vs `draft pendiente`);
- CTA unico de ejecucion (`aplicar recomendacion + generar + abrir QA`) para evitar pasos ambiguos;
- score por dimension mostrando valor activo y delta de proyeccion contra baseline QA oficial.

Sprint 4 (Composer UX de produccion) en avance:
- paneles principales rebatibles para reducir ruido cognitivo en sesiones editoriales largas;
- acceso rapido entre `vista operativa` y `diagnostico completo` sin perder el draft actual;
- estado de alineacion visible en el flujo (`QA consolidado` / `falta regenerar` / `solo proyeccion`).

Sprint 5 (Composer orientado a objetivos) en avance:
- playbooks editoriales con ejecucion en un clic (`densidad util`, `compactar rail`, `cierre QA`);
- cadena de ajustes + regeneracion dirigida (`technical_core`, `exam_rail`, `full`) dentro del mismo flujo;
- trazabilidad de objetivo aplicado en bitacora Composer para comparar impacto por pagina.

Sprint 6 (Composer con direccion operativa) en avance:
- accion primaria recomendada por contexto (`objetivo recomendado`) para reducir decision fatigue;
- comparativa visual `before/after` por zonas (intro, tecnico, rail examen) tras cada ajuste;
- feedback de estado orientado a cierre (`QA consolidado`, `falta regenerar`, `solo proyeccion`).

Sprint 7 (Composer contextual por bloque) en avance:
- scope sugerido por bloque seleccionado (`technical_core`, `exam_rail`, `full`) visible en el panel;
- regeneracion dirigida por bloque desde Composer sin salir del flujo de edicion;
- trazabilidad de regeneracion contextual en la bitacora para comparar impacto por zona.

Sprint 8 (flujo guiado operativo) en avance:
- barra de proceso con estado vivo por paso (`ajustar`, `guardar`, `generar`, `QA`);
- progreso de cierre visible en porcentaje + siguiente paso pendiente;
- CTAs por paso dentro del bloque de proceso para evitar navegacion ambigua.

Sprint 9 (orquestacion de cierre en Composer) en avance:
- CTA unico de "siguiente accion sugerida" conectado al paso pendiente real;
- lista de bloqueos operativos explicita para destrabar cierre editorial;
- continuidad del flujo sin saltos manuales (`ajustar -> guardar -> generar -> QA`).

Sprint 10 (QA server sync en Composer) en avance:
- sincronizacion manual `1-click` para refrescar output + QA + bitacora sin cambiar de vista;
- auto-sync silencioso al volver foco a la pestana (evita score viejo en Composer);
- timestamp de ultima sincronizacion para trazabilidad de lectura activa.

Sprint 11 (QA hard gate de cierre) en avance:
- gate de cierre `LOCKED/UNLOCKED` con bloqueos explicitos en lenguaje operativo;
- CTA de siguiente paso bloquea cierre final cuando QA servidor no llega a 9.5 o no esta alineado;
- mensaje de desbloqueo/accion correctiva dentro del mismo flujo Composer.

Sprint 12 (Batch Control Plane MVP) en avance:
- endpoints batch en Composer (`run`, `status`, `retry-failed`) sobre `generation_runs`;
- ejecucion secuencial de lote contra pipeline real (`/studio/generate-visual-atlas-page`);
- panel operativo Batch Runner dentro de Composer para iniciar lote, refrescar estado y reintentar fallidas.

Sprint 13 (QA post-render real) en avance:
- el renderer escribe marcas medibles en el HTML final (`data-zone`, alturas y slot visual);
- QA genera evidencia post-render: upper, rail inferior, densidad, bloqueos y alertas;
- Composer y QA editorial consumen la misma evidencia para explicar por que una pagina se aleja del 9.5.

Sprint 14 (modo operador Composer) en avance:
- Composer separa modo `Operador` y modo `Diagnostico`;
- la accion primaria queda visible arriba como siguiente paso sugerido;
- la lectura post-render se muestra en el flujo operativo para decidir si compactar rail, usar mejor el upper o pasar a QA.

Sprint 15 (evidencia real -> accion) cerrado en codigo:
- Composer prioriza la evidencia post-render real por encima del score proyectado;
- el plan post-render convierte upper subutilizado, rail inferior mal aprovechado o bloqueos estructurales en una accion concreta;
- el QA hard gate bloquea cierre si la evidencia real del HTML cae por debajo del umbral compositivo.

---

## Alcance por cloud

Primera linea activa:
- Azure -> AI-200.

Modelo de expansion previsto:
- Azure (nuevas certificaciones),
- AWS,
- Google Cloud,
- y otras rutas de certificacion tecnica.

La arquitectura esta pensada para repetir contrato + pipeline por formato, no para un caso unico.

---

## Arquitectura resumida

```text
artifacts/
  api-server/
    data/page-seeds/
    domain/editorial-contracts/
    services/generation/
    services/renderers/
    services/qa/
    routes/
  studio/
    pages/
    components/
    lib/
lib/
  db/
  api-spec/
  api-client-react/
  api-zod/
```

Pieza clave:
- contrato visual centralizado para Visual Atlas:
  - [artifacts/api-server/src/domain/editorial-contracts/visual-atlas-v24.ts](/C:/Users/jguerra/OneDrive%20-%20Datco%20S.A/Documentos/Editorial%20IA/cloudbooks-studio/artifacts/api-server/src/domain/editorial-contracts/visual-atlas-v24.ts)

---

## Requisitos

- Node.js 24+
- pnpm 9+
- PostgreSQL

Variables de entorno:

```env
DATABASE_URL=postgres://...
OPENAI_API_KEY=sk-...
SESSION_SECRET=...
```

---

## Desarrollo local

```bash
pnpm install
pnpm --filter @workspace/db run push
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/studio run dev
```

---

## Operacion en Replit

```bash
pnpm sync:replit
```

Este comando:
- sincroniza `origin/main`,
- instala dependencias,
- ejecuta `db push`,
- deja runtime alineado al SHA remoto.

---

## Estrategia editorial actual (Visual Atlas)

Base:
- topbar, hero, contexto, pregunta guia, traps/autocheck y footer en HTML deterministico;
- bloque visual superior generado por IA bajo contrato;
- QA estructural + editorial antes de aprobar.

Meta editorial:
- llevar score total a 9.5 para salida por lotes, con consistencia entre paginas.

---

## Proximo paso del Studio

1. Composer operativo para decisiones reales, no solo lectura.
2. Ajustes por bloque con regeneracion dirigida.
3. Grounding puntual por tema con TTL editorial (7 dias).
4. Escalado de la misma arquitectura a mas certificaciones y formatos.

---

## Documentacion interna

- [docs/editorial-composer-spec.md](/C:/Users/jguerra/OneDrive%20-%20Datco%20S.A/Documentos/Editorial%20IA/cloudbooks-studio/docs/editorial-composer-spec.md)
- [docs/editorial-composer-transition-and-red-team.md](/C:/Users/jguerra/OneDrive%20-%20Datco%20S.A/Documentos/Editorial%20IA/cloudbooks-studio/docs/editorial-composer-transition-and-red-team.md)
- [docs/composer-market-state-2026-05-31.md](/C:/Users/jguerra/OneDrive%20-%20Datco%20S.A/Documentos/Editorial%20IA/cloudbooks-studio/docs/composer-market-state-2026-05-31.md)
- [docs/composer-red-team-premortem-2026-05-31.md](/C:/Users/jguerra/OneDrive%20-%20Datco%20S.A/Documentos/Editorial%20IA/cloudbooks-studio/docs/composer-red-team-premortem-2026-05-31.md)
- [docs/sprint-closure-checklist.md](/C:/Users/jguerra/OneDrive%20-%20Datco%20S.A/Documentos/Editorial%20IA/cloudbooks-studio/docs/sprint-closure-checklist.md)

---

## Benchmark visual (referencias de industria)

Para elevar la interfaz del Studio sin perder foco editorial, Composer incorpora un benchmark operativo inspirado en patrones de sistemas abiertos:

- [Microsoft Fluent UI](https://github.com/microsoft/fluentui)
- [IBM Carbon Design System](https://github.com/carbon-design-system/carbon)
- [Adobe React Spectrum](https://github.com/adobe/react-spectrum)
- [GitHub Primer](https://github.com/primer/react)

CloudBooks no copia estos sistemas tal cual: toma criterios de legibilidad, jerarquia, densidad y consistencia para convertirlos en reglas productivas del contrato visual.

# Composer: estado real y benchmark de stack (2026-05-31)

## 1) Estado real del Composer hoy

### Lo que SI esta funcionando
- Vista Composer dedicada por pagina (`/composer/:id`).
- Carga de propuesta compositiva desde API (`/api/studio/composer/proposal/:pageId`).
- Persistencia de draft en BD (`PUT /api/studio/composer/draft/:pageId`).
- Drag and drop de bloques en el canvas draft.
- Cambio de variantes por bloque.
- Acciones editoriales rapidas (compactar rail, expandir contexto, reforzar nucleo tecnico, estructura 4 tarjetas).
- Proyeccion de score editorial del draft y comparativa contra QA real.
- Navegacion directa hacia Generacion y QA.

### Lo que NO esta resuelto aun
- El draft Composer no gobierna la generacion final de HTML (hoy es apoyo editorial, no motor de layout productivo).
- No existe regeneracion por bloque desde Composer (solo redirecciona a flujo general).
- No hay reconciliacion automatica "Composer -> QA servidor" despues de regenerar.
- El canvas actual es util para ordenar y ajustar, pero no llega aun a experiencia de maquetador premium.
- Exceso de paneles diagnosticos vs acciones de composicion de alto impacto.

### Diagnostico franco
Composer esta en fase **intermedia**:
- ya no es maqueta vacia;
- pero todavia no es un "editor de pagina" que cierre el loop completo hasta output final y aprobacion.

---

## 2) Benchmark de stack para un Composer premium

## Opcion A: `dnd-kit` + renderer propio (evolucion incremental)
- Que aporta:
  - drag/drop robusto y extensible;
  - ideal para listas, bloques y reorder con controles finos.
- Ventaja:
  - menor riesgo tecnico, se monta encima de la base actual.
- Limite:
  - para canvas editorial libre hay que construir bastante UI custom.

Referencia:
- [dnd kit](https://dndkit.com/)

## Opcion B: `reactflow` (nodos + conexiones + panel de propiedades)
- Que aporta:
  - modelo visual fuerte para bloques, relaciones y pipelines;
  - ecosistema maduro para custom nodes.
- Ventaja:
  - excelente para "sistema compositivo" y flujos de decision.
- Limite:
  - se siente mas "graph editor" que "page layout editor" si no se diseña bien.

Referencia:
- [React Flow Docs](https://reactflow.dev/learn)

## Opcion C: `tldraw` (canvas avanzado listo para editor)
- Que aporta:
  - engine completo de canvas con editor API;
  - interaccion avanzada (seleccion, zoom, manipulado, persistencia, colaboracion).
- Ventaja:
  - UX premium muy rapida de alcanzar.
- Limite:
  - mayor costo de integracion con reglas editoriales deterministicas y contratos existentes.

Referencia:
- [tldraw Docs](https://tldraw.dev/docs)

## Opcion D: `react-konva` / Konva (canvas 2D de bajo nivel)
- Que aporta:
  - control maximo de dibujo y performance 2D;
  - base solida para editor visual propio.
- Ventaja:
  - libertad total para interfaz editorial.
- Limite:
  - mayor costo de desarrollo/maintenance; mas "engine" que "producto listo".

Referencia:
- [Konva React](https://konvajs.org/docs/react/index.html)

---

## 3) Recomendacion para CloudBooks (realista y premium)

### Recomendacion principal
**Estrategia hibrida por fases**
1. Fase inmediata: reforzar Composer actual con interaccion premium y loop completo (sin reescribir todo).
2. Fase evolutiva: introducir `dnd-kit` para drag/drop mas fino en canvas.
3. Fase avanzada: incorporar `reactflow` para modo "mapa de composicion" (opcional, no bloqueante).

No recomiendo saltar directo a tldraw/konva en este punto porque:
- hoy el cuello de botella principal es integracion editorial y loop operativo, no ausencia de engine;
- necesitamos velocidad de producto con riesgo controlado.

---

## 4) Plan para llevar Composer a nivel "no cutre"

## Fase 1 (corto plazo, alta ganancia)
- Convertir Composer en "fuente operativa":
  - boton `Generar con este draft`.
  - la API de generacion debe aceptar `composerDraftId` o `useComposerDraft=true`.
  - persistir en metadata del output que version de draft genero la pagina.
- Mostrar "delta real":
  - QA previo vs QA posterior en la misma vista.
  - brecha explicita hacia 9.5 con causas priorizadas.
- Reducir ruido visual:
  - colapsables por defecto en diagnostico profundo.
  - acciones clave arriba: `Guardar`, `Generar`, `Revisar QA`.

## Fase 2 (producto editorial)
- Panel lateral tipo inspector de bloque:
  - altura objetivo,
  - densidad textual,
  - variante visual,
  - prioridad en narrativa.
- Reglas editoriales ejecutables:
  - lint de composicion antes de permitir generar.
  - ejemplo: rail inferior <= X px, min 2 bloques tecnicos, 1 pregunta guia, 1 autocheck.

## Fase 3 (premium)
- Modos de trabajo:
  - `Locked` (deterministico),
  - `Composer Minor` (ajustes sin romper contrato),
  - `Composer Structural` (cambia peso y orden de bloques),
  - `Composer Full` (control mayor bajo guardrails).
- Recomendador de mejoras:
  - "si quieres subir Direccion de arte +0.6: aplica A, B, C".

---

## 5) Riesgos si no cerramos esta brecha
- Seguiremos con un Composer "bonito pero no decisivo".
- El equipo seguira corrigiendo por intuicion en QA, sin ciclo rapido de mejora.
- Dificil escalar a multiples certificaciones y formatos con consistencia premium.

---

## 6) Decision recomendada para la siguiente iteracion

Adoptar inmediatamente este criterio:
- Composer deja de ser solo analitica.
- Composer pasa a ser el **punto de control previo a generar**.
- Cada generacion debe poder trazarse a:
  - seed/base,
  - draft composer,
  - contrato visual activo.

Con eso, el sistema gana velocidad, calidad y reproducibilidad.

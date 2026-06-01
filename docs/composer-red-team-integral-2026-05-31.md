# Composer Red Team Integral (2026-05-31)

## Resumen ejecutivo

Composer ya es util para operacion asistida pagina-a-pagina, pero todavia no alcanza nivel "control plane batch" para produccion industrial.

- Puntaje global actual: **7.8 / 10**
- Umbral de salida premium esperado: **9.5 / 10**
- Riesgo principal: deuda de orquestacion batch + sobrecarga cognitiva en UX + heuristica compositiva no conectada al render real.

---

## Evidencia de arquitectura actual

### Hallazgos estructurales

1. Composer frontend esta altamente acoplado en un solo archivo.
   - `artifacts/studio/src/pages/composer.tsx` tiene ~3723 lineas.
   - Impacto: mantenimiento lento, riesgo de regresion cruzada, baja velocidad de onboarding.

2. El motor compositivo usa heuristicas estimadas de altura, no medicion de layout real renderizado.
   - `estimateBlockHeight` y `computeSpacePlan`:
     - `/artifacts/studio/src/pages/composer.tsx:286`
     - `/artifacts/studio/src/pages/composer.tsx:313`
   - Impacto: posibilidad de recomendaciones correctas "en teoria" pero incorrectas en output final.

3. Score Composer se proyecta por formula y no por lectura visual del render final.
   - `buildProjectedQaScores`:
     - `/artifacts/studio/src/pages/composer.tsx:456`
   - Impacto: riesgo de "optimismo de score" antes de consolidar QA servidor.

4. Existe fallback local para propuesta Composer si API falla.
   - `buildClientProposal` + fallback:
     - `/artifacts/studio/src/pages/composer.tsx:595`
     - `/artifacts/studio/src/pages/composer.tsx:868`
   - Impacto: doble verdad potencial (API vs fallback local).

5. Backend de generacion es single-page; no hay endpoint batch con cola/retry.
   - Endpoint actual:
     - `/artifacts/api-server/src/routes/studio-generate.ts:236`
   - No aparecen endpoints `composer/batch`, `queue`, `retry`:
     - busqueda en `studio-composer.ts` y `studio-generate.ts` sin resultados.

6. Composer backend ya persiste draft y logs (base solida para batch control plane).
   - Proposal/draft/actions:
     - `/artifacts/api-server/src/routes/studio-composer.ts:111`
     - `/artifacts/api-server/src/routes/studio-composer.ts:154`
     - `/artifacts/api-server/src/routes/studio-composer.ts:240`
     - `/artifacts/api-server/src/routes/studio-composer.ts:261`
   - Autofix event:
     - `/artifacts/api-server/src/routes/studio-composer.ts:316`

---

## Red Team por dimension

### 1) Producto (riesgo: alto)
- Composer aun no "absorbe" una corrida batch completa con reglas y reintentos.
- Consecuencia: dependencia excesiva de supervision humana por pagina.

### 2) UX de operacion (riesgo: alto)
- Hay mejoras, pero aun existe densidad alta de bloques/controles.
- Falta modo "operador batch" con 3 acciones maximas por fase.

### 3) Consistencia editorial (riesgo: medio/alto)
- Sin medicion sobre render real, persiste riesgo de huecos/marcos/jerarquia debil en output.

### 4) Datos y trazabilidad (riesgo: medio)
- Buen avance en logs y sync, pero falta trazabilidad batch agregada:
  - estado por pagina en cola,
  - motivo de bloqueo,
  - ETA y throughput.

### 5) Escalabilidad tecnica (riesgo: medio/alto)
- Monolito frontend del Composer penaliza velocidad de entrega.

---

## Premortem (si seguimos sin cambios)

1. Se inicia batch 01-10, pero el equipo termina operando manualmente pagina por pagina.
2. Las metricas muestran avance, pero hay variaciones visuales que reaparecen en QA final.
3. El tiempo promedio por pagina sube; la promesa de escalado "10 en 10" no se cumple.
4. Se pierde confianza interna en Composer y vuelve el uso de fixes ad hoc fuera de flujo.

---

## Sprint 12+ propuesto (operativo)

### Sprint 12 (must-have): Batch Control Plane MVP

Objetivo:
- Ejecutar lotes desde Composer con estados deterministas y control de reintentos.

Entregables:
1. Endpoint batch run:
   - `POST /api/studio/composer/batch/run`
   - payload: `batchId`, `pageIds`, `scopePolicy`, `retryPolicy`.
2. Endpoint batch status:
   - `GET /api/studio/composer/batch/:runId`
   - devuelve queue por pagina: `queued|running|done|blocked|failed`.
3. UI Batch Runner (modo operador):
   - iniciar corrida,
   - pausar/reanudar,
   - retry failed,
   - cerrar lote con reporte.
4. Log estructurado por corrida:
   - throughput,
   - error classes,
   - tiempo a aprobable por pagina y por lote.

Criterio de aceptacion:
- Correr 5 paginas consecutivas sin intervencion manual por pagina.
- Poder reintentar solo fallidas.
- Reporte final de lote con estado por pagina.

### Sprint 13 (must-have): QA visual conectado a render real

Objetivo:
- Reducir divergence entre score Composer y resultado visual final.

Entregables:
1. Medicion post-render (DOM/canvas snapshot) para espacio real.
2. Regla de bloqueo si densidad/rail/jerarquia se desvian del contrato.
3. Delta explicado: `proyectado vs real`.

### Sprint 14 (must-have): UX operador premium

Objetivo:
- Bajar carga cognitiva y convertir Composer en consola de produccion.

Entregables:
1. Modo Operador (minimal) y Modo Diagnostico (avanzado).
2. Nomenclatura unica de acciones.
3. Playbook por incidencias frecuentes (1 click -> accion + scope + QA sync).

---

## Decision recomendada

- **No declarar Composer "listo batch" todavia.**
- Declararlo en fase: **"Batch-Orchestrator Beta"**.
- Gate para pasar a "Production Batch Ready":
  1. Batch run MVP estable,
  2. Retry selectivo,
  3. QA visual real conectado al contrato,
  4. 2 lotes consecutivos (>=5 paginas) cerrados sin desvio manual fuera de flujo.


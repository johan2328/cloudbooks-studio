# Sprint 16 - Layout Engine v1

Fecha: 2026-06-01

## Proposito

Sprint 16 deja de tratar el Composer como una pantalla de recomendaciones y lo conecta a un motor editorial de layout. La idea central es simple: una pagina no avanza por promesa del draft, avanza por evidencia del HTML real.

## Que se implemento

- `visual-atlas-layout-engine-v1` en el API server.
- Decision de readiness:
  - `approved_candidate`
  - `needs_targeted_fix`
  - `blocked`
- Accion primaria de layout:
  - regenerar pagina completa,
  - reforzar nucleo visual,
  - compactar rail inferior,
  - expandir contexto dirigido,
  - revision visual humana,
  - candidato a aprobacion.
- `batchGate` para decidir si una pagina puede entrar a produccion por lote.
- Persistencia de `layoutEngine` en `metadata.json`.
- Exposicion del motor en QA Report, QA editorial y Composer.
- Registro de `layout_engine` y `batch_gate` en runs de batch Composer.

## Por que importa

Esto crea una frontera operativa:

- Composer no se juzga solo por UI.
- QA no se juzga solo por score.
- Batch no se ejecuta solo porque existe HTML.

La decision nace de:

- evidencia post-render,
- score QA servidor,
- existencia de imagen real,
- bloqueos estructurales,
- uso real del upper visual,
- densidad del rail inferior.

## Limite honesto

Este motor todavia no mide screenshot con bounding boxes reales. Mide el HTML final con marcadores estructurales y datos de render declarados por el contrato. Es un avance importante, pero no reemplaza un futuro motor con Playwright/captura visual, deteccion de overflow, lectura de cajas y comparacion contra golden screenshots.

## Gate estrategico

Si despues de validar paginas 01-05 el Composer sigue sin cambiar outputs visibles, el siguiente bloque no debe ser otro sprint de UI. Debe ser:

1. captura real de screenshot;
2. medicion de bounding boxes;
3. solver de layout;
4. preview diff contra version anterior;
5. rechazo automatico de batch cuando el solver detecte huecos o microtexto.


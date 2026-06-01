# Composer Sprint 17 - Visual Measurement V1

Fecha: 2026-06-01

## Objetivo

Cerrar una brecha critica del Composer: dejar de depender solo de evidencia estructural inferida y empezar a medir el HTML renderizado como pieza visual real.

El problema que este sprint ataca:

- el Composer podia recomendar acciones por layout, pero no sabia si el browser realmente estaba mostrando overflow, microtexto o aire muerto;
- el QA podia puntuar una pagina, pero no tenia una captura verificable de pagina completa;
- el preview podia seguir apuntando al `upper-art.png`, ocultando problemas del ensamble final.

## Implementacion

- Se agrego `visual-atlas-page-measurement.ts` como medicion opcional basada en Playwright.
- La generacion escribe `page.html` antes de medir.
- Si Playwright/Chromium esta disponible:
  - abre el HTML final con viewport 768x1152;
  - toma `preview.png` de pagina completa;
  - mide canvas, zonas `data-zone`, ocupacion, overflow y microtipografia;
  - calcula score visual, warnings y blockers.
- Si Playwright no esta disponible:
  - el pipeline no falla;
  - `visualMeasurement.available=false`;
  - QA/Composer muestran la razon y siguen operando con QA estructural.

## Datos nuevos

`metadata.json` ahora puede incluir:

```json
{
  "visualMeasurement": {
    "version": "visual-measurement-v1",
    "available": true,
    "renderer": "playwright",
    "score": 9.1,
    "overflow": { "count": 0 },
    "typography": { "smallTextCount": 0 },
    "zoneUsage": {
      "upper_visual": { "occupancyPct": 86.4 },
      "exam_rail": { "freeBottomPx": 34 }
    }
  }
}
```

## Impacto en Composer

Composer ahora puede leer una evidencia mas dura:

- score visual real;
- overflow del browser;
- microtexto detectado;
- aire libre real en rail inferior;
- ocupacion real del upper visual.

Esto mejora la decision del `layoutEngine` y del plan post-render. Si el render real detecta bloqueos, la accion primaria se vuelve concreta: regenerar, compactar rail o reforzar nucleo tecnico.

## Red Team

Lo que mejora:

- El sistema deja de confundir "estructura valida" con "pagina visualmente sana".
- El preview puede representar la pagina completa, no solo el asset superior.
- QA, Composer y metadata comparten la misma evidencia.

Lo que sigue pendiente:

- Activar Playwright en Replit si se quiere medicion real siempre encendida.
- Convertir mediciones visuales en patches de layout mas automaticos, no solo recomendaciones.
- Medir calidad semantica del upper visual, que todavia requiere vision/modelo o revision humana.

## Premortem

Si Sprint 17 no mejora el producto, las causas probables serian:

1. Playwright no esta instalado en runtime y la medicion queda offline.
2. Las mediciones detectan huecos, pero el Composer aun no recompone automaticamente la pagina.
3. El upper visual generado por IA sigue siendo semanticamente pobre aunque el canvas este correcto.

Decision operativa:

- Sprint 17 es la base de instrumentacion.
- El siguiente salto no deberia ser mas UI: debe ser aplicar remedios automaticos desde estas mediciones.

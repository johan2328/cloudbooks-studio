# Composer Red Team + Premortem (2026-05-31)

## Contexto
Evaluacion dura del estado actual del Composer para Visual Atlas dentro de CloudBooks Studio, con foco en:

- velocidad editorial real;
- consistencia premium;
- trazabilidad para operar en batches;
- valor concreto para una startup que produce libros vendibles.

## Red Team (sin filtro)

### 1) Riesgo de "panel bonito" sin impacto real
- **Problema**: demasiada capa de diagnostico puede sentirse cosmetica si no dispara cambios verificables en salida final.
- **Impacto**: desgaste del editor, baja confianza, loop lento.
- **Mitigacion aplicada hoy**:
  - Composer -> generar con draft activo;
  - QA delta before/after;
  - etiqueta de origen de score (servidor vs draft pendiente);
  - benchmark con checks accionables (no solo score).

### 2) Desalineacion de verdad entre vistas
- **Problema**: cuando QA y Composer no muestran la misma lectura, el equipo no sabe que creer.
- **Impacto**: decisiones erraticas y bloqueo de aprobacion.
- **Mitigacion aplicada hoy**:
  - regla de precedencia: QA servidor manda, salvo draft mas nuevo;
  - alerta explicita de divergencia.

### 3) Composer aun no es maquetador tipo InDesign
- **Problema**: sigue siendo composicion por bloques, no edicion pixel-level ni control fino de layout.
- **Impacto**: algunas correcciones siguen requiriendo regeneracion completa.
- **Mitigacion parcial**:
  - canvas ordenable + variantes + atajos editoriales;
  - semaforo de readiness.
- **Pendiente estructural**:
  - regeneracion por bloque;
  - panel de propiedades con constraints por bloque;
  - undo/redo y versionado visual.

### 4) Riesgo de deuda narrativa por sobre-optimizar score
- **Problema**: perseguir 9.5 puede forzar composiciones correctas pero sin hook narrativo.
- **Impacto**: libro tecnicamente bien, comercialmente frio.
- **Mitigacion propuesta**:
  - introducir criterio de ritmo narrativo en benchmark;
  - validar lectura con muestra de usuarios objetivo.

### 5) Riesgo operativo de lotes
- **Problema**: aunque pagina a pagina funciona, en batch puede romper consistencia o tiempos.
- **Impacto**: costo alto, retrasos, fatiga editorial.
- **Mitigacion propuesta**:
  - gate por lote (01-05, 06-10...) con checklist de salida;
  - observabilidad de tiempos por etapa (draft -> generate -> QA -> approve).

## Premortem (si fallamos en 6 meses, por que fue)

1. El Composer no se convirtio en herramienta central, solo en panel paralelo.
2. QA siguio mostrando senales ambiguas y se erosiono la confianza del equipo.
3. Se priorizo "pasar score" por encima de utilidad de examen y legibilidad real.
4. No se cerraron workflows de lote; cada pagina siguio siendo proyecto unico.
5. La arquitectura no termino de separarse por formato (Visual Atlas vs otros libros).

## Senales tempranas de fracaso (alarmas)
- El editor abre Generacion directamente y evita Composer.
- Se aprueban paginas con brecha > 1.0 hacia 9.5 por cansancio.
- Aumenta el numero de regeneraciones completas por cambios menores.
- Runs y contrato no son fuente de verdad del equipo.

## Plan de endurecimiento (proxima iteracion)

### P0 (inmediato)
- Consolidar QA/Composer/Runs con una sola semantica de score.
- Medir "tiempo a pagina aprobable" por pagina.
- Activar autocorreccion guiada desde benchmark (atajos premium).

### P1
- Regeneracion dirigida por bloque (nucleo tecnico / rail inferior).
- Panel de propiedades por bloque (densidad, longitud, prioridad visual).
- Historial de drafts con comparativa entre versiones.

### P2
- Composer multi-formato (reutilizable para Master Book, Traps, etc.).
- Validacion de consistencia entre certificaciones, no solo AI-200.

## Conclusion franca
El Composer ya salio de etapa "juguete", pero aun no esta en estadio "sistema editorial premium cerrado".
Con los cambios de hoy, esta en MVP operativo fuerte; con P0 + P1 cerrados, puede convertirse en ventaja competitiva real.

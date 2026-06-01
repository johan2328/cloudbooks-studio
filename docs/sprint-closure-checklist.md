# Sprint Closure Checklist (CloudBooks Studio)

## Objetivo
Cerrar cada sprint con una regla clara y repetible: no por intuicion, sino por evidencia operacional.

---

## Gate de cierre (5/5 obligatorios)

Marca `SI` solo con evidencia verificable.

1. **Objetivo del sprint cumplido**
   - El outcome acordado al inicio del sprint esta implementado y visible en producto.
   - Evidencia: demo funcional + referencia a tickets.

2. **Sin deuda critica dentro del alcance**
   - No quedan pendientes `P0` o `P1` del alcance comprometido.
   - Cualquier pendiente restante esta reclasificado como `P2/P3` con ticket creado.

3. **Flujo end-to-end validado**
   - Al menos 1 flujo completo probado en runtime real del equipo.
   - Ejemplo Visual Atlas: `Composer -> Generar -> QA -> Actividad/Exportacion`.

4. **Criterios de aceptacion verificados**
   - Todos los criterios de cada ticket comprometido estan en estado `Accepted`.
   - No alcanza con “code merged”; debe estar validado en comportamiento.

5. **Cierre administrativo**
   - Backlog del sprint en `Done`.
   - Documento de cierre registrado con:
     - que se entrego,
     - que no entro y por que,
     - riesgo residual.

---

## Semaforo de cierre

- **Verde**: 5/5 gates en `SI` -> sprint cerrado.
- **Amarillo**: 4/5 -> no cierra; se abre mini-extension (max 48h) solo para completar gate faltante.
- **Rojo**: <=3/5 -> sprint no cerrable; replanificacion inmediata.

---

## Evidencia minima por sprint

1. Link a PRs/commits finales.
2. Video corto o capturas del flujo end-to-end.
3. Resultado QA final del alcance sprint.
4. Log de actividad/runs de los casos validados.
5. Lista de riesgos abiertos con owner y fecha objetivo.

---

## Plantilla de acta de cierre

```md
Sprint: [nombre/id]
Fecha cierre: [YYYY-MM-DD]
Owner: [nombre]

Outcome comprometido:
- [...]

Resultado:
- [cumplido/parcial/no cumplido]

Gates (5/5):
1) Objetivo cumplido: [SI/NO] - evidencia: [...]
2) Sin P0/P1 abiertos: [SI/NO] - evidencia: [...]
3) E2E validado: [SI/NO] - evidencia: [...]
4) Aceptacion verificada: [SI/NO] - evidencia: [...]
5) Cierre administrativo: [SI/NO] - evidencia: [...]

Riesgo residual:
- [...]

Pendientes movidos a siguiente sprint:
- [ticket] [prioridad] [owner]

Decision final:
- [CERRADO / NO CERRADO]
```

---

## Regla operativa importante

Si hay duda sobre si el sprint termino, **se considera no cerrado** hasta que exista evidencia objetiva de los 5 gates.

# Composer Red Team - Sprint 15

Fecha: 2026-06-01

## Dictamen franco

Composer ya no debe evaluarse por cantidad de paneles o botones. Debe evaluarse por una pregunta dura:

> ¿Toma una pagina generada, entiende donde falla contra 9.5 y ejecuta una correccion reproducible que cambie el output real?

Despues de Sprint 15, el modulo avanza porque conecta evidencia post-render con accion. Aun asi, no alcanza para declararlo premium definitivo. Si en Replit sigue por debajo de 8/10 tras validar paginas 01-05, conviene detener sprints incrementales de UI y pasar a una estrategia de motor de layout.

## Score actual estimado

- Valor operativo: 8.0/10.
- UI/UX editorial: 7.4/10.
- Robustez para batch: 7.6/10.
- Potencial de producto: 8.8/10.
- Produccion sin supervision: 6.8/10.

## Lo que mejoro

- La evidencia real del HTML ya puede mandar sobre la proyeccion del Composer.
- Upper, rail inferior, densidad y bloqueos estructurales generan un plan post-render accionable.
- El gate editorial ya puede bloquear por evidencia real, no solo por score del servidor.
- El operador tiene una siguiente accion concreta, no solo diagnostico.

## Riesgos criticos

1. El Composer todavia no es un motor de diagramacion. Es una capa de decision sobre un renderer fijo.
2. El canvas visual no demuestra aun que los cambios del draft alteren de manera profunda la pagina final.
3. La medicion post-render es estructural, pero no reemplaza inspeccion visual de screenshot.
4. La batch production todavia depende de que cada pagina regenere correctamente y de que el output real sea legible.
5. Si la API de imagen falla, el sistema puede parecer funcional por HTML, pero no cumple la promesa visual premium.

## Premortem

El Composer fracasa comercialmente si:

- el usuario aprieta botones y el layout final se ve igual;
- el score sube pero el humano sigue viendo huecos, microtexto o iconografia pobre;
- batch produce diez paginas con variaciones de estilo que no se detectan hasta el final;
- el equipo editorial no entiende que accion conviene ejecutar y por que;
- la app vende "IA asistida" pero actua como checklist tecnico.

## Recomendacion estrategica

Sprint 15 debe ser el ultimo sprint incremental antes de una decision. Si la validacion real no muestra mejora visible, el proximo bloque no debe ser otro panel: debe ser un layout engine.

Ese motor deberia incluir:

- snapshot real con Playwright o renderer equivalente;
- medicion visual de bounding boxes, overflow, aire y legibilidad;
- solver de restricciones para elegir alturas, variantes y rail;
- generacion dirigida solo despues de resolver estructura;
- comparador batch contra golden pages.

## Siguiente decision

Validar en Replit con paginas 01-05:

- si Composer >= 8 y el output cambia, seguir con mejoras de motor;
- si Composer < 8 o el output no cambia, congelar UI y atacar el layout engine.


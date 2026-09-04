---
name: landing-evolve
description: >-
  Evoluciona la landing de CloudBooks a un nivel superior manteniendo la identidad de marca.
  Úsalo cuando el usuario pida "mejorar/rediseñar la landing", "contrapropuesta", "subir de nivel
  el hero/sección", "más impacto", o quiera nuevas secciones (prueba social, FAQ, métricas, pricing).
  Trabaja una sección a la vez, propone variantes y conserva el contrato visual.
  Carga primero la skill cloudbooks-design-system.
---

# Landing Evolve — Evolución fuerte sin perder la marca

Objetivo: elevar conversión y percepción de calidad de `pages/landing.tsx` **sin** traicionar la
identidad (ver skill `cloudbooks-design-system`). "Evolución fuerte" = replantear hero, narrativa y
secciones con cambios notables, pero sigue siendo inconfundiblemente CloudBooks.

## Flujo de trabajo
1. **Carga el contrato** (`cloudbooks-design-system`) y lee la sección objetivo actual.
2. **Diagnóstico breve**: qué falla hoy (jerarquía, claim, prueba, fricción del CTA).
3. **Propón 2 variantes** en palabras antes de codear si el cambio es grande; deja elegir.
4. **Implementa** con la stack existente. No añadas dependencias nuevas (respeta `minimumReleaseAge`).
5. **Verifica**: typecheck (`pnpm --filter @workspace/studio typecheck`) y revisa responsive + a11y.

## Palancas de "siguiente nivel" (catálogo priorizado)
**Hero**
- Claim más afilado: beneficio medible > descripción. Sub-claim con prueba ("6 formatos", "QA ≥ 9.5").
- Jerarquía: 1 acción primaria clara + 1 secundaria. Quitar ruido.
- Elemento vivo: el hero-image al 50% opacidad desaprovecha; considerar mock interactivo, parallax sutil o preview real de un formato.
- Señal de confianza inmediata bajo el CTA (certificación activa, garantía, nº de formatos).

**Prueba y credibilidad (falta hoy)**
- Franja de logos/tecnologías (Azure, Microsoft Learn como fuentes), métricas, o testimonios.
- "Mini-muestra" real: una página del Visual Atlas o una Exam Trap como evidencia, no claim.

**Narrativa de producto**
- El timeline de 6 formatos es fuerte → hacerlo más interactivo (hover revela ejemplo real).
- Conectar problema → solución → prueba → oferta con transiciones claras.

**Oferta / pricing**
- Los packs no muestran precio ni anclaje. Añadir precio, comparativa y "BEST VALUE" más persuasivo.
- Reducir fricción: CTA contextual por tarjeta, garantía/condiciones.

**Cierre**
- CTA final con recordatorio del diferenciador (Human Audit) y baja fricción.
- FAQ corta que mate objeciones (¿actualizado?, ¿en español?, ¿sirve para aprobar?).

## Micro-interacciones permitidas
Reutiliza keyframes de `index.css`. Añade con criterio: hover-reveal, count-up de métricas,
gradiente animado en bordes de tarjeta destacada, cursor-follow sutil en el hero. Siempre
`prefers-reduced-motion`. Nada que distraiga del mensaje.

## Restricciones
- Sin librerías nuevas salvo que el usuario lo apruebe (política supply-chain del repo).
- `rounded-sm`, paleta por dominio, Inter, español LATAM.
- Cada claim nuevo debe ser defendible (tono editorial CloudBooks).
- Cambios grandes → primero variantes en texto, luego código.

## Entregable
Cambios en `pages/landing.tsx` (o componentes nuevos en `components/landing/`), typecheck en verde,
y un resumen de qué cambió y por qué (impacto esperado en conversión/percepción).

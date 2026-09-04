---
name: ui-design-review
description: >-
  Revisión crítica de UI/UX de la landing y páginas comerciales de CloudBooks. Úsalo cuando el
  usuario pida "revisa el diseño", "qué mejorarías", "auditoría visual/UX", "feedback de la página",
  o tras implementar cambios en la landing. Evalúa jerarquía, conversión, consistencia con el
  contrato visual, accesibilidad y responsive. Devuelve hallazgos priorizados, no reescrituras.
---

# UI Design Review — Auditoría de la landing CloudBooks

Revisa contra el contrato (`cloudbooks-design-system`) + buenas prácticas de landing de alta conversión.
**No reescribas**: entrega hallazgos accionables, priorizados, con el fix concreto.

## Dimensiones (revisa todas)
1. **Jerarquía visual** — ¿el ojo va al claim → CTA primario? ¿Un solo foco por pantalla?
2. **Mensaje/copy** — claim claro y defendible, beneficio > features, sin hype, español LATAM correcto.
3. **Conversión** — CTA primario único y visible, fricción mínima, prueba social, anclaje de precio.
4. **Consistencia de marca** — paleta por dominio/formato, `rounded-sm`, Inter, tono editorial.
5. **Accesibilidad** — contraste AA (ojo con `text-white/40` sobre fondos claros), foco visible,
   `alt`, `aria-hidden` en decorativos, navegación por teclado, `prefers-reduced-motion`.
6. **Responsive** — breakpoints `md`/`lg`, hero en móvil (la imagen se oculta `hidden lg:flex`),
   tap targets ≥ 44px, no overflow horizontal.
7. **Rendimiento/percepción** — peso de imágenes, animaciones que no bloqueen, `IntersectionObserver`
   para diferir, evitar layout shift.
8. **Detalle/pulido** — espaciado consistente, alineación, estados hover/active/focus, micro-copy.

## Formato de salida
Para cada hallazgo:
- **[Prioridad]** Alta / Media / Baja
- **Dónde**: archivo:línea (ej. `landing.tsx:239`)
- **Problema**: qué y por qué importa (impacto en usuario/conversión)
- **Fix**: cambio concreto y mínimo

Agrupa por dimensión. Empieza por las 3 de mayor impacto. Sé específico, no genérico
("mejora el contraste" ❌ → "el eyebrow `text-white/40` no pasa AA sobre `#0a1220`; sube a `/55`" ✅).

## Señales de alerta frecuentes en esta landing
- Hero-image al 50% de opacidad: ¿resta impacto o intención?
- Falta de prueba social / precios visibles.
- Densidad de labels uppercase: puede saturar — verificar ritmo.
- Muchos CTAs compitiendo ("Ver Books", "Studio", "Colecciones", "Demo").

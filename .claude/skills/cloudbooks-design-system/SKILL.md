---
name: cloudbooks-design-system
description: >-
  Contrato visual y editorial de CloudBooks Studio. Úsalo SIEMPRE antes de crear o
  modificar cualquier página/sección de la landing o el sitio comercial (landing.tsx,
  nuestra-labor, empresas, demo, books, packs). Define tokens de color, tipografía,
  espaciado, patrones de sección, micro-interacciones, tono editorial y los 6 formatos.
  Trigger: "landing", "hero", "sección", "rediseño", "CTA", "página comercial", "contrato visual".
---

# CloudBooks — Contrato de Diseño

Stack: **React + Vite + Tailwind v4 + shadcn/ui (Radix) + framer-motion + wouter**.
Fuente: **Inter** (`font-sans`) · mono para números/labels técnicos. Idioma: **español (LATAM)**.
App principal: `artifacts/studio/src`. Landing: `pages/landing.tsx`. Tema: `index.css`.

## Identidad
Editorial técnico, oscuro, sobrio — "Apple oscuro × ficha de ingeniería". Nada juguetón.
Autoridad tranquila: mucho espacio negativo, jerarquía estricta, acentos quirúrgicos.

## Tokens de color (literales usados en la landing)
| Rol | Valor | Uso |
|-----|-------|-----|
| Fondo base | `#0d1629` | secciones principales |
| Fondo profundo | `#0a1220` | secciones alternas (contraste) |
| Azul | `#2563eb` (blue-600) | aprendizaje / primario |
| Violeta | `#7c3aed` (violet-600) | visual / creación |
| Teal | `#0d9488` / teal-400 | calidad / "best value" / activo |
| Ámbar | `#d97706` / amber-500 | repaso · sello Human Audit (cierre) |
| Verde | `#059669` | cierre / rapid review |
| Rojo | red-400/500 | SOLO para el bloque "problema" |

**Texto sobre oscuro:** `text-white/90` (títulos), `/55`–`/65` (cuerpo), `/40` (secundario), `/25`–`/30` (legal).
**Bordes:** `border-white/[0.06]` a `/[0.10]`. **Fondos sutiles:** `bg-white/[0.03]`–`/[0.04]`.

## Tipografía
- H1 hero: `text-4xl md:text-[3.2rem] font-black leading-[1.08] tracking-tight`
- H2 sección: `text-3xl md:text-4xl font-black`
- Eyebrow/label: `text-[9px]–[11px] font-bold uppercase tracking-[0.2em] text-white/40`
- Cuerpo: `text-base text-white/55 leading-relaxed`
- Mono técnico (nums, códigos cert): `font-mono tracking-wide`
- **Gradiente de marca en texto:** `bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent`

## Geometría y espaciado
- Radio: **`rounded-sm` casi siempre** (estética técnica). Círculos solo en pasos/sellos.
- Ritmo vertical de secciones: `py-20` a `py-28`. Contenedor: `max-w-6xl`/`max-w-7xl mx-auto px-6`.
- Separador superior de sección: `h-px bg-gradient-to-r from-transparent via-{color}-500/30 to-transparent`.
- Fondos ambientales: grid sutil (`opacity-[0.02]–[0.03]`) + glows blur-3xl `opacity-[0.05]–[0.10]`.

## Botones
- Primario: `bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-semibold rounded-sm` + icono `ArrowRight`.
- Secundario: `border border-white/15 hover:border-white/30 text-white/60 hover:text-white/90`.
- Fantasma: texto `text-white/40 hover:text-white/70` + `ChevronRight`.
- Alturas compactas: `h-7`–`h-11`. Iconos: **lucide-react**.

## Micro-interacciones (ya en index.css)
Keyframes disponibles: `fadeSlideUp`, `march` (línea punteada), `pulseRing`, `barFill`, `barShimmer`,
`timelineDraw`, `stepGlow`, `domainPulse`. **Reutilízalos, no inventes equivalentes.**
Patrón estándar de entrada: `IntersectionObserver` (threshold 0.15–0.25) → estado `inView` →
`opacity`/`translateY` con `transition` y `delay` escalonado (`i * 120ms`). Respeta `prefers-reduced-motion`.

## Producto: los 6 formatos (orden y color fijos)
01 Master Book (azul · aprendizaje) · 02 Visual Atlas (violeta · visual) · 03 Exam Traps (teal · criterio) ·
04 Question Bank (azul · práctica) · 05 Cheat Sheets (ámbar · repaso) · 06 Rapid Review (verde · cierre).
Paquetes de compra: **Master Book**, **Visual Atlas**, **Collection Pack** (BEST VALUE, los 6).

## Metodología (mensaje clave)
"Estudio editorial humano-agentes": baterías de agentes por dominio (Conocimiento/Creación/Calidad) +
**Human Audit final, QA ≥ 9.5** (sello ámbar). Es el diferenciador — no diluirlo.

## Tono editorial (copy)
Afirmaciones precisas, sin hype. Verbos de criterio ("produce", "valida", "cubre todo el ciclo").
Evitar superlativos vacíos. Cada claim debe ser defendible. Español neutro LATAM.

## Reglas duras
1. Nunca romper la coherencia de color por formato/dominio.
2. `rounded-sm` por defecto; nada de esquinas muy redondeadas.
3. Animaciones: sutiles, con propósito, accesibles. Reutilizar keyframes existentes.
4. Rutas con `wouter` (`useLocation`), no `<a href>` para navegación interna real.
5. Accesibilidad: contraste AA, `alt`, foco visible, `aria` en elementos decorativos (`aria-hidden`).

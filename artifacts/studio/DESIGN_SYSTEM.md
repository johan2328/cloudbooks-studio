# CloudBooks — Design System

Sistema de diseño del portal comercial **CloudBooks Editorial** (marca oscura,
editorial-premium). Este documento es la fuente de verdad de los tokens y
patrones que ya viven en el código. Si vas a centralizarlos, exportá los objetos
`D` y `C` desde un único módulo (ver [Cómo centralizar](#cómo-centralizar)).

> Stack: React 19 · Vite · Tailwind v4 · shadcn/ui · framer-motion · wouter.
> Los estilos se aplican mayormente con **estilos inline + tokens** (no clases de
> color de Tailwind), para mantener una paleta única y consistente.

---

## 1. Marca y principios

- **Tono visual:** editorial, oscuro, premium. Tipografía protagonista, mucho
  aire, filetes finos (hairlines), acentos de color por dominio y **oro** como
  sello de calidad/aprobación.
- **El oro (`gold`) es el color de marca/clímax:** se reserva para valor, calidad
  (QA 9.7+), "Mejor valor", y el sello de aprobación. No usarlo como relleno
  decorativo genérico.
- **Restraint:** animaciones sutiles, una sola pasada cuando es posible. Nada de
  loops llamativos ni estética "gamer".

---

## 2. Tipografía

| Rol | Familia | Uso |
|-----|---------|-----|
| Display / títulos | `D` = `'Space Grotesk','Inter',sans-serif` | h1–h3, números, precios, CTAs |
| Cuerpo | `var(--app-font-sans)` (Inter) | párrafos, descripciones |
| Kicker / etiqueta | `font-mono` | versalitas con `tracking` amplio (rótulos, "DOMINIO 01", precios USD) |

```ts
const D = "'Space Grotesk','Inter',sans-serif";
```

### Escala (responsiva con `clamp`)

| Token | Tamaño | Ejemplo |
|-------|--------|---------|
| Hero h1 | `clamp(3rem, 6.6vw, 5.4rem)` · `lineHeight 0.92` · `tracking -0.045em` | título principal landing |
| Section h2 | `clamp(2rem, 4.8vw, 3.6rem)` · `tracking -0.03em` | encabezados de sección |
| h3 | `1.25–1.5rem` (`text-xl`/`text-2xl`) · `weight 700` | títulos de tarjeta |
| Body | `0.875–1rem` (`text-sm`/`text-base`) · `leading-relaxed` | párrafos |
| Small / desc | `13–14px` | descripciones de tarjeta |
| Kicker mono | `10–12px` · `uppercase` · `tracking 0.18–0.28em` | rótulos |

- **Pesos:** 500 (nav/links), 600 (CTAs/labels), 700 (títulos/precios).
- **Numerales editoriales:** numeral en contorno con
  `WebkitTextStroke: 1.6px <color>` + `color: transparent`.

---

## 3. Color

Paleta única. Exportar como `C` y usar tokens (no hex sueltos).

```ts
const C = {
  // superficies
  bg:      "#0a0a0e",  // fondo base
  bgAlt:   "#101016",  // fondo alterno / radiales
  card:    "#15151d",  // tarjetas, inputs
  deep:    "#0d1629",  // panel oscuro (pricing destacado)
  // texto
  ink:     "#f3f3f6",            // texto principal
  inkSoft: "rgba(243,243,246,0.62)", // texto secundario
  // acentos
  violet:    "#8b5cf6",  // primario de marca
  violetBtn: "#6d28d9",  // botón primario (relleno)
  bright:    "#c4b5fd",  // violeta claro (links/acentos sobre oscuro)
  blue:      "#3b82f6",
  teal:      "#2dd4bf",
  green:     "#34d399",
  gold:      "#fbbf24",  // valor / calidad / aprobación
};
```

### Opacidades / hairlines (convención hex de 8 dígitos sobre `ink`)

| Uso | Valor |
|-----|-------|
| Borde sutil de tarjeta | `${C.ink}14` (≈8%) |
| Borde/diviso­r medio | `${C.ink}1f` (≈12%) |
| Texto muy tenue / pie | `${C.ink}55` |
| Tinte de fondo por color | `${color}1f` fondo, `${color}33`–`${color}55` borde |

### Color por dominio / formato

| Formato | Color |
|---------|-------|
| Master Book | `#3b82f6` (blue) |
| Visual Atlas | `#8b5cf6` (violet) |
| Exam Traps | `#2dd4bf` (teal) |
| Question Bank | `#38bdf8` |
| Cheat Sheets | `#fbbf24` (gold) |
| Rapid Review | `#34d399` (green) |
| Collection Pack | `#fbbf24` (`PACK_COLOR`) |

### Pilares del método (gradientes verticales)

| Pilar | De → A |
|-------|--------|
| Conocimiento / Fuentes | `#67e8f9` → `#3b82f6` |
| Creación / Experiencia | `#d8b4fe` → `#8b5cf6` |
| Calidad / Metodologías | `#5eead4` → `#22c55e` |

### Texto en degradado

```tsx
style={{
  backgroundImage: `linear-gradient(100deg, ${C.violet}, ${C.blue} 55%, ${C.teal})`,
  WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
}}
```

---

## 4. Layout y espaciado

- **Anchos de contenedor:** `max-w-[1240px]` / `max-w-[1280px]` (nav, grids
  comerciales), `max-w-[820px]–[920px]` (texto legal/ayuda), `px-6` lateral.
- **Ritmo vertical de sección:** `py-24` / `py-28` (desktop).
- **Grids de tarjetas:** `grid sm:grid-cols-2 xl:grid-cols-3 gap-4`.
- **Filete superior de sección (decorativo):**
  `linear-gradient(90deg, transparent, ${color}40, transparent)` de `1px`.

### Radios

| Token | Uso |
|-------|-----|
| `rounded-full` | botones, chips, badges, avatares |
| `rounded-2xl` | tarjetas, paneles |
| `rounded-xl` | inputs, ítems de lista/carrito |
| `rounded-md`/`rounded-lg` | miniaturas, contenedores de ícono |

---

## 5. Componentes

### Botones

| Variante | Estilo |
|----------|--------|
| Primario | `bg #6d28d9` (violetBtn), texto `#fff`, `weight 600`, `rounded-full`, `h-11`, `hover:brightness-110` |
| Valor / Pack | `bg #fbbf24` (gold), texto `#0d1629`, `weight 700` |
| Secundario / outline | `border 1px ${C.violet}66`, texto `C.bright`, fondo transparente |
| Éxito / "En tu biblioteca" | `bg ${C.green}1f`, texto `C.green`, `border ${C.green}55` |
| Ghost / link | texto `C.bright`, con `ArrowRight` que se desplaza en hover |

Altura estándar **44px** (`h-11`); compactos `h-9/h-10`. Ícono guía
(`ArrowRight`) con `group-hover:translate-x-1`.

### Tarjetas

`backgroundColor: C.card` + `border: 1px ${C.ink}14`, `rounded-2xl`.
Hover de elevación: `transition-transform hover:-translate-y-1`.
Tarjeta destacada/pack: fondo con gradiente del color + borde del color.

### Inputs (formularios)

```
rounded-xl · h-11 · px-4 · bg C.bg/C.card · border 1px ${C.ink}1f · text C.ink
focus-visible:ring-2 focus-visible:ring-violet-500/60 · outline-none
```
Siempre con `label`+`htmlFor`, `autoComplete`, `name`, `required` donde aplique.
`textarea` con contador de caracteres alineado a la derecha.

### Chips / badges

`rounded-full`, mono `10–11px`, `uppercase tracking`. Fondo `${color}1f`,
borde `${color}33–40`, texto del color. Badge "MEJOR VALOR": `bg gold`,
texto `#0d1629`.

### Portada de libro (`BookCover`)

- Proporción **2:3** → `aspectRatio: "1023 / 1537"` (originales 1023×1537 px).
- `object-contain` (nunca recortar el título/pie).
- Orden de carga: `webp → jpg → png`; fallback a gradiente del color.
- Prop `priority` para LCP (`loading=eager` + `fetchPriority=high`).

### Footer (`SiteFooter`)

Compartido en todas las páginas comerciales. © + Aviso legal · Privacidad ·
Ayuda y Soporte · English (traductor) + redes (X, Instagram). Borde superior
`1px ${C.ink}1f`.

### Carrito (contexto + `CartPanel`)

- Estado global vía `CartProvider`/`useCart()` (NO estados locales por página).
- API: `items, add, remove, clear, total, count, open, setOpen`.
- Ítem: `{ id, name, cert, format, price }`. `id` = esquema de catálogo
  (`AI-200-collection-pack`, `AI-200-master-book`, …). Dedupe por `id`.

### Marcas de pago (`PayMark`)

Placa clara (`#fff`), `rounded-[5px]`, borde sutil + sombra; logo ~22px
`object-contain`. Archivos oficiales en `public/badges/` (`visa.svg`,
`mastercard.svg`, `maestro.svg`, `jcb.svg`, `mercadopago.svg`); fallback a
`react-icons`.

---

## 6. Movimiento

```ts
const EASE = [0.16, 1, 0.3, 1]; // ease "premium" estándar
```

- **Reveal de entrada:** `up` = `{ hidden: {opacity:0, y:24}, show: {opacity:1, y:0, transition:{duration:0.7, ease:EASE}} }`.
- **Stagger:** contenedor con `staggerChildren: 0.12`, hijos con `variants`.
- **whileInView:** `viewport={{ once: true, amount: 0.2–0.4 }}`.
- **Duraciones:** micro-interacciones 0.2–0.35s; reveals 0.6–0.9s; ambientes
  (glow/float) 3–7s.
- **Una sola pasada > loop.** Para destellos (sheen) usar `whileInView` con
  `once`. Loops solo para glows muy sutiles.
- **Accesibilidad:** envolver la app en `<MotionConfig reducedMotion="user">`;
  en CSS animado, guardar `@media (prefers-reduced-motion: reduce)`.

---

## 7. Iconografía

- **UI:** `lucide-react`, `strokeWidth 1.4–2`, tamaño 16–24 (hasta 46 en
  destacados). Color = token o `currentColor`.
- **Marca/logos:** `react-icons` (`Si*` para nube/pagos, `Fa*` para redes).
  No descargar logos con copyright: ir a `public/` como assets del proyecto.
- **Trazo en degradado:** definir `linearGradient` en un `<defs>` y aplicar
  `stroke="url(#id)"` (en SVG directo) o `stroke:url(#id)` por CSS al `svg`.

---

## 8. Accesibilidad (baseline)

- `html { color-scheme: dark }`.
- Foco visible: `focus-visible:ring-2 focus-visible:ring-violet-400/70` (o
  `outline 2px ${C.violet}` con `offset`).
- Estados vivos: `role="status"` + `aria-live="polite"` en confirmaciones.
- Controles no nativos: `role`, `aria-checked`, `aria-current`, `aria-label`.
- Formularios: `label`/`htmlFor`, `autoComplete`, `name`, `spellCheck` según campo.
- Respetar `prefers-reduced-motion` (ver §6).

---

## 9. Contenido / formato

- **Moneda:** `fmtUSD(n)` → `"USD 5.99"` (`Intl.NumberFormat`, `currencyDisplay: "code"`).
- **Precios:** formato USD 5.99 · pack USD 19.99.
- **Calidad:** "QA / score superior a 9.7".
- **Idioma:** español (LATAM). "English" en footer abre traductor de Google.
- **Fechas:** absolutas y en español ("14 de mayo de 2026").

### localStorage (claves versionadas)

| Clave | Contenido |
|-------|-----------|
| `cloudbooks_cart_v1` | carrito |
| `cloudbooks_library_v1` | biblioteca |
| `cloudbooks_reviews_v1` | reseñas |
| `cloudbooks_helpful_v1` | votos "Útil" |

---

## 10. Cómo centralizar

Hoy `D`, `C` y `EASE` se redefinen por archivo. Para escalar, exportarlos una vez:

```ts
// src/lib/theme.ts
export const D = "'Space Grotesk','Inter',sans-serif";
export const EASE = [0.16, 1, 0.3, 1] as const;
export const C = { /* …tokens de §3… */ } as const;
```

Y reemplazar las definiciones locales por `import { C, D, EASE } from "@/lib/theme"`.
Opcional: exponer los mismos valores como CSS variables en `index.css`
(`--cb-violet`, `--cb-gold`, …) para usarlos también desde Tailwind/clases.

---

_Última actualización: 2026-06-06._

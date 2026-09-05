/* ════════════════════════════════════════════════════════════════════════════
   CATÁLOGO compartido — usado por /colecciones (tienda) y /libro/:id (ficha).
   Datos de demo (inventados). // TODO_REAL: reemplazar reseñas/ratings reales.
   ════════════════════════════════════════════════════════════════════════════ */

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

export interface FormatDef {
  name: string; tag: string; color: string; blurb: string;
  long: string; bullets: string[]; toc: string[]; pages: number;
  rating: number; reviewCount: number;
}

export const FORMATS: FormatDef[] = [
  {
    name: "Master Book", tag: "Aprendizaje profundo", color: "#3b82f6",
    blurb: "Dominios, servicios y arquitectura explicados a fondo.",
    long: "El libro troncal de la colección. Recorre el temario oficial completo desde los fundamentos hasta el nivel exigido por el examen, con ejemplos sobre servicios reales y notas de criterio en cada dominio.",
    bullets: [
      "Cobertura íntegra del temario oficial, dominio por dominio.",
      "De cero a nivel examen, sin asumir conocimientos previos.",
      "Ejemplos prácticos con servicios reales de Azure.",
      "Notas de criterio y glosario con referencias cruzadas.",
    ],
    toc: ["Fundamentos de IA y uso responsable", "Azure AI Services y Cognitive Services", "Visión por computador", "Procesamiento de lenguaje natural", "Azure OpenAI Service", "Soluciones de IA generativa"],
    pages: 320, rating: 4.8, reviewCount: 214,
  },
  {
    name: "Visual Atlas", tag: "Estudio visual", color: "#8b5cf6",
    blurb: "Diagramas, mapas de decisión y comparaciones.",
    long: "Toda la colección traducida a imágenes: diagramas de arquitectura, mapas de decisión y tablas comparativas para entender más rápido y fijar conceptos que en texto cuestan más.",
    bullets: [
      "Diagramas de arquitectura para cada servicio clave.",
      "Mapas de decisión: qué servicio usar y cuándo.",
      "Tablas comparativas lado a lado.",
      "Pensado para repaso visual de alto rendimiento.",
    ],
    toc: ["Mapa general del examen", "Árboles de decisión por servicio", "Diagramas de arquitectura", "Comparativas de servicios", "Flujos de datos de IA", "Esquemas de IA generativa"],
    pages: 180, rating: 4.9, reviewCount: 176,
  },
  {
    name: "Exam Traps", tag: "Criterio de examen", color: "#2dd4bf",
    blurb: "Las trampas y matices reales que evalúa el examen.",
    long: "El criterio fino que separa aprobar de no aprobar: distractores típicos, matices de enunciado y errores frecuentes, explicados para que no caigas en ellos el día del examen.",
    bullets: [
      "Distractores típicos y por qué parecen correctos.",
      "Matices de enunciado que cambian la respuesta.",
      "Errores frecuentes y cómo evitarlos.",
      "Reglas mnemotécnicas para decidir bajo presión.",
    ],
    toc: ["Cómo lee el examen", "Trampas por dominio", "Palabras clave que cambian todo", "Casos límite", "Checklist anti-error"],
    pages: 120, rating: 4.7, reviewCount: 143,
  },
  {
    name: "Question Bank", tag: "Práctica", color: "#38bdf8",
    blurb: "Banco de preguntas con explicación razonada.",
    long: "Practica con preguntas al estilo del examen, cada una con explicación razonada de por qué la correcta lo es y por qué las demás no. Incluye simulacros cronometrados.",
    bullets: [
      "Preguntas al estilo y dificultad reales del examen.",
      "Explicación de cada opción, correcta e incorrecta.",
      "Simulacros cronometrados de práctica.",
      "Cobertura proporcional al peso de cada dominio.",
    ],
    toc: ["Preguntas por dominio", "Explicaciones razonadas", "Simulacro 1", "Simulacro 2", "Análisis de resultados"],
    pages: 220, rating: 4.7, reviewCount: 198,
  },
  {
    name: "Cheat Sheets", tag: "Repaso", color: "#fbbf24",
    blurb: "Resúmenes de referencia para repaso rápido.",
    long: "La colección comprimida a sus esenciales: fichas de referencia rápida para repasar en minutos lo que importa, ideales para los días previos al examen.",
    bullets: [
      "Una ficha por dominio con lo imprescindible.",
      "Definiciones, límites y números clave a un vistazo.",
      "Formato pensado para imprimir o repasar en móvil.",
      "Ideal para los días previos al examen.",
    ],
    toc: ["Ficha: fundamentos de IA", "Ficha: servicios cognitivos", "Ficha: visión", "Ficha: lenguaje", "Ficha: IA generativa"],
    pages: 48, rating: 4.6, reviewCount: 121,
  },
  {
    name: "Rapid Review", tag: "Cierre", color: "#34d399",
    blurb: "Repaso final intensivo antes del examen.",
    long: "El cierre de la preparación: un recorrido intensivo y guiado por todo lo esencial para consolidar la víspera del examen y llegar con la mente fresca.",
    bullets: [
      "Recorrido intensivo por todo lo esencial.",
      "Secuencia de repaso optimizada para la víspera.",
      "Preguntas relámpago de autoevaluación.",
      "Plan de las últimas 48 horas.",
    ],
    toc: ["Repaso exprés por dominio", "Preguntas relámpago", "Mapa mental final", "Plan de 48 horas", "Checklist del día del examen"],
    pages: 64, rating: 4.8, reviewCount: 109,
  },
];

export interface CertDef { cert: string; title: string; domain: string; available: boolean; eta: string | null; }

export const CERTS: CertDef[] = [
  { cert: "AI-200", title: "Azure AI Cloud Developer Associate", domain: "Inteligencia artificial en Azure", available: true, eta: null },
  { cert: "AB-620", title: "AI Agent Builder Associate", domain: "Agentes de IA en Copilot Studio", available: true, eta: null },
  { cert: "AZ-900", title: "Azure Fundamentals", domain: "Fundamentos de nube", available: false, eta: "Q3 2026" },
  { cert: "AI-900", title: "Azure AI (Generativa)", domain: "IA generativa en Azure", available: false, eta: "Q3 2026" },
  { cert: "DP-900", title: "Azure Data Fundamentals", domain: "Datos en Azure", available: false, eta: "Q4 2026" },
  { cert: "AZ-104", title: "Azure Administrator", domain: "Administración de Azure", available: false, eta: "2027" },
  { cert: "AZ-305", title: "Azure Solutions Architect", domain: "Arquitectura en Azure", available: false, eta: "2027" },
];

export interface Product {
  id: string; cert: string; certTitle: string; domain: string;
  format: string; tag: string; color: string; blurb: string;
  price: number; available: boolean; eta: string | null; pack: boolean;
}

export const PACK_COLOR = "#fbbf24";

/* formato de moneda consistente (ISO "USD" para evitar ambigüedad en LATAM) */
const _usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", currencyDisplay: "code" });
export const fmtUSD = (n: number) => _usd.format(n); // → "USD 5.99"

export const PRODUCTS: Product[] = CERTS.flatMap(c => {
  const formats: Product[] = FORMATS.map(f => ({
    id: `${c.cert}-${slug(f.name)}`, cert: c.cert, certTitle: c.title, domain: c.domain,
    format: f.name, tag: f.tag, color: f.color, blurb: f.blurb,
    // 9.99 por formato: alineado con lo que publica el engine en backCover.price.
    // Antes decia 5.99 y el engine 9.99, asi que el precio mostrado dependia de si
    // la fabrica respondia o no. Este valor es el fallback; el engine sigue mandando.
    price: 9.99, available: c.available, eta: c.eta, pack: false,
  }));
  const pack: Product = {
    id: `${c.cert}-collection-pack`, cert: c.cert, certTitle: c.title, domain: c.domain,
    format: "Collection Pack", tag: "Los seis formatos", color: PACK_COLOR,
    blurb: "Los seis formatos de la colección, al mejor precio.",
    price: 19.99, available: c.available, eta: c.eta, pack: true,
  };
  return [pack, ...formats];
});

export const FORMAT_CHIPS = ["Collection Pack", ...FORMATS.map(f => f.name)];

export function getProduct(id: string) { return PRODUCTS.find(p => p.id === id); }
export function formatDef(name: string) { return FORMATS.find(f => f.name === name); }
export function productsForCert(cert: string) { return PRODUCTS.filter(p => p.cert === cert); }

/* ── reseñas (demo) ─────────────────────────────────────────────────────── */
export interface Review { name: string; initials: string; color: string; date: string; stars: number; title: string; body: string; helpful: number; }

export const REVIEWS: Review[] = [
  { name: "Sofía Marín", initials: "SM", color: "#8b5cf6", date: "28 de julio de 2026", stars: 5, title: "Justo lo que necesitaba", body: "Aprobé la semana pasada. Las láminas visuales me ayudaron a fijar los conceptos que más me costaban. Muy recomendable.", helpful: 9 },
  { name: "Bruno Ferreyra", initials: "BF", color: "#38bdf8", date: "12 de julio de 2026", stars: 5, title: "Claro y directo", body: "Sin relleno: cada página apunta a algo que cae en el examen. Lo terminé en pocos días y llegué con confianza.", helpful: 7 },
  { name: "Camila Duarte", initials: "CD", color: "#2dd4bf", date: "30 de junio de 2026", stars: 4, title: "Muy bueno, sumaría más práctica", body: "El contenido es excelente y en español impecable. Le pondría 5 con algún simulacro extra, pero lo recomiendo igual.", helpful: 5 },
  { name: "Tomás Aguilar", initials: "TA", color: "#fbbf24", date: "16 de junio de 2026", stars: 5, title: "Nivel editorial premium", body: "La presentación es de otro nivel, se nota el cuidado en cada detalle. Vale totalmente lo que cuesta.", helpful: 6 },
  { name: "Mariana Restrepo", initials: "MR", color: "#8b5cf6", date: "14 de mayo de 2026", stars: 5, title: "Aprobé a la primera con esto", body: "Estudié dos semanas solo con la colección y aprobé con holgura. Las explicaciones van al grano y los ejemplos son justo lo que cae en el examen.", helpful: 38 },
  { name: "Carlos Tévez", initials: "CT", color: "#3b82f6", date: "2 de mayo de 2026", stars: 5, title: "El mejor material en español", body: "Llevaba meses buscando algo serio en español y esto es otro nivel. Se nota la curaduría humana, no es contenido genérico.", helpful: 27 },
  { name: "Valentina Ríos", initials: "VR", color: "#2dd4bf", date: "28 de abril de 2026", stars: 4, title: "Muy completo, le faltó un detalle", body: "Excelente estructura y muy claro. Le doy 4 porque me hubiera gustado algún simulacro más, pero el contenido es impecable.", helpful: 19 },
  { name: "Diego Salinas", initials: "DS", color: "#fbbf24", date: "21 de abril de 2026", stars: 5, title: "Vale cada centavo", body: "Por el precio esperaba menos. El nivel de detalle y la presentación son de editorial premium de verdad.", helpful: 22 },
  { name: "Lucía Fernández", initials: "LF", color: "#34d399", date: "9 de abril de 2026", stars: 5, title: "Ideal para repasar", body: "Lo combiné con mi propio estudio y para los días finales fue clave. Repasé todo lo importante en muy poco tiempo.", helpful: 14 },
  { name: "Andrés Pacheco", initials: "AP", color: "#38bdf8", date: "30 de marzo de 2026", stars: 4, title: "Recomendado", body: "Contenido sólido y bien explicado. Se entiende incluso sin experiencia previa en la nube.", helpful: 11 },
];

/** Distribución de estrellas (porcentaje 5★→1★) — demo. */
export const RATING_DIST = [82, 13, 3, 1, 1];

/* ════════════════════════════════════════════════════════════════════════════
   FORMATOS DEL PRODUCTO — los 6 libros de cada coleccion.

   Vivian en lib/catalog.ts (tienda), pero el cockpit tambien los necesita:
   pages/publicacion.tsx importaba FORMATS desde el catalogo de la tienda y era la
   UNICA dependencia del panel interno hacia la tienda en todo el frontend.

   No es un dato de la tienda: es el contrato de QUE ES CloudBooks -que formatos
   existen, como se llaman, de que trata cada uno-. Por eso vive en shared/.
   ════════════════════════════════════════════════════════════════════════════ */

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

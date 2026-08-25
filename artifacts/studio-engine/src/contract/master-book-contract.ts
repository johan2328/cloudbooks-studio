/**
 * CONTRATO DEL MASTER BOOK (formato documental). Fuente de verdad de las reglas de
 * CONTENIDO y MAQUETADO que implementan el autor (grounding/author-chapter), el
 * divisor (book/chapter-divider-gen) y el render/ensamblaje (book/render-chapter,
 * book/assemble-master-book). Emula lo homologable del Visual Atlas; cambia la
 * intención (exposición continua) pero conserva la naturaleza de los módulos.
 */
export const MASTER_BOOK_CONTRACT = {
  format: "master-book",
  structure: {
    hybrid: "24 CAPÍTULOS (uno por módulo) agrupados en 9 RUTAS (una por dominio del examen; rótulo 'Ruta N', converge con el Atlas). El índice y los abre-partes reflejan esta jerarquía.",
    reason: "El módulo es la unidad pedagógica/psicométrica; la ruta es el marco del blueprint del examen. Diferencia el Master Book del Atlas (lámina por unidad) — no repite su capa de divisores de ruta.",
  },
  partOpener: {
    kind: "Portal oscuro — imagen full-bleed NAVY OSCURO con ondas/red luminosas (CONTRASTE con el divisor de capítulo, que es claro).",
    content: "RUTA N (número gigante blanco) + título de ruta + UN gancho de una línea + lista 'EN ESTA RUTA' (abreboca de los capítulos). Poco texto, máximo impacto. Anclado al 1er abre-parte (master) para consistencia.",
  },
  page: {
    size: "6in × 9.3in",
    margin: ".6in .55in",
    folios: true,
    foliosNote: "Numeración de páginas emulando el Atlas: folios en el CUERPO; el divisor de capítulo NO lleva folio.",
  },
  chapterOpener: {
    kind: "image-divider",
    note: "La PRIMERA página del capítulo es un DIVISOR de imagen full-bleed, mismo lenguaje que el Atlas (CAPÍTULO N + título + 3 párrafos de introducción legibles). Anclado al 1er divisor (master) para arte idéntico.",
    fallback: "Si no hay imagen: opener con MARCA DE AGUA leve + la intro legible (lo que iría en la sección introductoria del capítulo).",
  },
  sections: {
    titles: "IDÉNTICOS al Atlas (getSkillTitleEs): una sección por unidad, en el orden del temario.",
    prose: "Prosa documental PROFUNDA (varios párrafos): construye el razonamiento del PsychoProfile y desactiva las trampas del examen dentro de la exposición.",
    layout: "Justificada. NO pueden quedar bloques / páginas semivacías.",
  },
  graphics: {
    max: 3,
    role: "COMPLEMENTARIOS y PARCOS: el peso visual del producto vive en el Visual Atlas.",
    numbering: "Numerados 'Figura N.M' en el epígrafe (numeración de imágenes).",
    referencedInPrecedingParagraph: "El ÚLTIMO párrafo de la sección que PRECEDE a un gráfico DEBE reseñarlo — un gráfico nunca queda suelto.",
    noConsecutive: "NUNCA dos gráficos en secciones consecutivas.",
    fillEmptySpace: "Usar un gráfico para que una página no quede semivacía, respetando las reglas anteriores.",
  },
  keyTakeaways: {
    align: "IZQUIERDA (no justificado).",
    count: "3 a 6.",
  },
  matter: {
    frontMatter: "Portada + COPYRIGHT/disclaimer de marca (pág 2) + 'Contenido del libro' (índice de secciones, estilo .bidx) + Prefacio + Mapeo de dominios + Cómo usar este libro + Guía de estudio (si aplica) + índice AGRUPADO por parte. MISMAS secciones editoriales que el Atlas; el disclaimer de la pág 2 es IDÉNTICO entre libros salvo el nombre del libro y el acento de paleta.",
    backMatter: "Antes del examen + Casos de examen (si aplica) + GLOSARIO (términos del RELATO de los capítulos) + REFERENCIAS (fuentes citadas, dedupe alfabético). Contenido PROPIO del libro.",
    brandIdentity: "La IDENTIDAD DE MARCA es la referencia: copyright (pág 2), índice, glosario y referencias son IGUALES en estructura entre los libros de la familia; solo varían el NOMBRE del libro y el ACENTO de la paleta (cfg.style.accent).",
    bibliography: "2 COLUMNAS (clase .bib). El VISUAL ATLAS es el CANONICAL de bibliografía de la familia — el Master Book (y los demás formatos) emulan su maquetado a 2 columnas. NO usar listas a 1 columna.",
    preface: "El PREFACIO tiene el MISMO número de párrafos en TODOS los libros de la misma familia: 6 (canonical). Copy PROPIO por libro, SIN nombrar a ningún otro formato de la colección.",
    noOtherFormatNamed: "El copy del Master Book NO menciona a ningún otro formato de la colección (p.ej. 'Visual Atlas') para no excluir libros futuros. El nombre del libro es 'Master Book' (no 'libro maestro').",
    folios: "Continuos en el cuerpo; portada/copyright/abre-partes/divisores SIN folio.",
  },
  language: "Español neutro de LATAM, sin voseo.",

  // ── ROADMAP cross-libro (arquitectura de familia) ──
  crossBookRoadmap: {
    groundingIsCrossBook: "El GROUNDING (corpus + verificación) es CROSS a los 6 formatos de una certificación, no propio de un libro. Debe vivir en una sección a nivel CERTIFICACIÓN (fuera del Atlas); cada libro CONSUME el corpus groundeado. Pendiente de desacople.",
    familyAlignmentAgent: "Agente que alinea la CONVERGENCIA y COMPLEMENTARIEDAD (visual, educativa, comunicativa) entre la familia de 6 libros de una cert. Se ACTIVA al crear el 2º libro de la familia. Vive en la sección cross.",
    webImpact: "Todas las stages del estudio deben reflejar el LIBRO ACTIVO — NADA del Atlas como plantilla del Master Book (p.ej. galería = las ~200 páginas del master, no las 98 láminas). Frente F.",
  },
} as const;

export type MasterBookContract = typeof MASTER_BOOK_CONTRACT;

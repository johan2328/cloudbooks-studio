/**
 * REGISTRO DE LA CUADRILLA DE AGENTES IA — la "plantilla de empleados" del estudio.
 * Es la FUENTE DE VERDAD del conteo de agentes. Cada agente mapea a uno o más `labels`
 * del ledger de costo (`recordTextSpend({label})`) o, para el Ilustrador, al `kind:"image"`.
 * El MODELO no se hardcodea acá: el rollup lo deriva del ledger (lo realmente usado).
 */

export type AgentDomain = "conocimiento" | "creacion" | "calidad";

export interface AgentDef {
  id: string;
  name: string;
  role: string;          // qué hace, en 1 línea (su "trabajo")
  domain: AgentDomain;
  iconKey: string;       // el front lo mapea a un ícono lucide
  labels?: string[];     // etiquetas del ledger que le pertenecen
  matchKind?: string;    // alternativa: matchea por kind (Ilustrador = todas las "image")
  /**
   * Formatos donde el agente INTERVIENE. Correlaciona con los contratos:
   * los agentes de diagramación image-2 ("atlas") no construyen un libro de TEXTO
   * (Master Book), cuyo contrato es solo Matter (tipografía). Ausente = "both".
   */
  scope?: "both" | "atlas" | "master";
  masterRole?: string;   // rol reescrito cuando el libro activo es de texto (evita "lámina/atlas")
}

export const DOMAIN_META: Record<AgentDomain, { label: string; color: string; blurb: string }> = {
  conocimiento: { label: "Conocimiento", color: "#3b82f6", blurb: "Reúne y verifica la materia prima: fuentes oficiales, contenido anclado y fiel." },
  creacion: { label: "Creación", color: "#8b5cf6", blurb: "Convierte el conocimiento en páginas: texto del libro e infografías del atlas." },
  calidad: { label: "Calidad", color: "#2dd4bf", blurb: "Ataca lo producido buscando errores antes que el examen: fidelidad, arte y coherencia." },
};

export const AGENT_REGISTRY: AgentDef[] = [
  // ── Conocimiento ──
  { id: "buscador", name: "Buscador", role: "Descubre y valida fuentes oficiales antes de que entren al corpus.", domain: "conocimiento", iconKey: "search", labels: ["search-query", "search-relevance"] },
  { id: "autor", name: "Autor", role: "Redacta el contenido de cada skill anclado a las fuentes, con citas.", domain: "conocimiento", iconKey: "pen", labels: ["author", "chapter-author"], masterRole: "Redacta la exposición documental de cada capítulo, anclada a las fuentes." },
  { id: "verificador", name: "Verificador de fidelidad", role: "Chequea cada afirmación contra las fuentes: respaldada, sin respaldo o contradicha.", domain: "conocimiento", iconKey: "shield-check", labels: ["verify-grounding", "verify-chapter"] },
  { id: "supervisor", name: "Supervisor de relevancia", role: "Juzga si las fuentes cubren el skill y si el contenido es pertinente (no genérico).", domain: "conocimiento", iconKey: "badge-check", labels: ["relevance-supervise", "supervise-chapter"], masterRole: "Juzga si el capítulo cubre el módulo y si la exposición es pertinente (cobertura + alineación psicométrica)." },
  { id: "psicometrista", name: "Psicometrista", role: "Analiza cómo evalúa el examen cada módulo (perfil psicométrico) para calibrar la exposición.", domain: "conocimiento", iconKey: "gauge", labels: ["psychometrics"], scope: "master" },
  { id: "auditor", name: "Auditor de tema", role: "Detecta contaminación cruzada: que cada lámina trate su tema oficial.", domain: "conocimiento", iconKey: "scan", labels: ["topic-audit"], masterRole: "Detecta contaminación cruzada: que cada capítulo trate su tema oficial." },

  // ── Creación ──
  { id: "layout", name: "Director de layout", role: "Planifica la composición visual antes de generar la lámina.", domain: "creacion", iconKey: "layout", labels: ["layout-director"], scope: "atlas" },
  { id: "ilustrador", name: "Ilustrador", role: "Dibuja cada lámina del Visual Atlas (gpt-image).", domain: "creacion", iconKey: "image", matchKind: "image", masterRole: "Dibuja las figuras complementarias de cada capítulo (gpt-image)." },
  { id: "disenador", name: "Diseñador de identidad", role: "Genera las páginas de diseño en Auto Pages: portada, contraportada, abre-rutas y divisores (gpt-image), ancladas a la marca.", domain: "creacion", iconKey: "layout", labels: ["book-cover", "book-backcover", "part-opener", "chapter-divider", "route-divider"] },
  { id: "guia", name: "Guía de estudio", role: "Redacta “cómo se comporta el examen” desde la guía oficial.", domain: "creacion", iconKey: "book-open", labels: ["study-guide"] },
  { id: "rutas", name: "Sintetizador de rutas", role: "Escribe la introducción de cada ruta del atlas.", domain: "creacion", iconKey: "route", labels: ["route-intro"], masterRole: "Escribe la introducción (abre-ruta) de cada ruta del libro." },
  { id: "glosario", name: "Lexicógrafo", role: "Extrae y define los términos clave del corpus (glosario).", domain: "creacion", iconKey: "list", labels: ["glossary"] },
  { id: "dominio", name: "Cartógrafo de dominio", role: "Arma el plan de estudio por ruta (dónde hacer foco).", domain: "creacion", iconKey: "map", labels: ["domain-map"] },
  { id: "ficha", name: "Redactor de ficha", role: "Redacta la ficha comercial del libro (sinopsis, acerca de, categorías, tags, blurb) para la tienda.", domain: "creacion", iconKey: "tag", labels: ["ficha-copy"] },

  // ── Calidad ──
  { id: "editorial", name: "Revisor editorial", role: "Puntúa la página en 5 criterios editoriales y emite veredicto.", domain: "calidad", iconKey: "edit", labels: ["qa-editorial"] },
  { id: "inspector", name: "Inspector de infografía", role: "Lee la imagen a ciegas y reporta fallas (estilo, fidelidad, autocheck).", domain: "calidad", iconKey: "eye", labels: ["infographic-qa"], scope: "atlas" },
  { id: "arte", name: "Crítico de arte", role: "Puntúa la calidad visual contra la rúbrica premium.", domain: "calidad", iconKey: "palette", labels: ["vision-score"], scope: "atlas" },
  { id: "editorjefe", name: "Editor jefe", role: "Revisa la coherencia editorial del libro ensamblado.", domain: "calidad", iconKey: "clipboard", labels: ["book-review"] },

  // ── Calidad · PANEL POR RUTA (leen la ruta ensamblada + su contenido y emiten un veredicto escrito, con score) ──
  { id: "production-editor", name: "Editor de producción", role: "Juzga la ruta ensamblada como libro impreso (estructura, ritmo, legibilidad, listo-para-imprenta).", domain: "calidad", iconKey: "book-marked", labels: ["panel-production-editor"], scope: "master" },
  { id: "sme-factcheck", name: "Linter técnico (SME)", role: "Chequeo DETERMINISTA (regla, sin LLM): caza credenciales inseguras, flags CLI inválidos y JMESPath roto. Cero ruido.", domain: "calidad", iconKey: "shield-alert", labels: ["panel-sme-factcheck"], scope: "master" },
  { id: "typography", name: "Tipógrafo", role: "Audita la composición tipográfica impresa: justificación, ríos, viudas/huérfanas y cortes de código.", domain: "calidad", iconKey: "type", labels: ["panel-typography"], scope: "master" },
  { id: "instructional-design", name: "Diseñador instruccional", role: "Juzga si la ruta ENSEÑA (objetivos medibles, worked-examples, alineación, Bloom) y no solo resume.", domain: "calidad", iconKey: "graduation-cap", labels: ["panel-instructional-design"], scope: "master" },
  { id: "grounding-fidelity", name: "Linter de fidelidad", role: "Chequeo DETERMINISTA de recuperación (sin LLM): marca afirmaciones con términos técnicos ausentes del corpus. Cero ruido.", domain: "calidad", iconKey: "file-search", labels: ["panel-grounding-fidelity"], scope: "master" },
  { id: "exam-alignment", name: "Alineación con el examen", role: "Mide si la ruta cubre y evalúa las skills-measured oficiales al nivel cognitivo que el examen exige.", domain: "calidad", iconKey: "target", labels: ["panel-exam-alignment"], scope: "master" },
  { id: "reader-engagement", name: "Lector / riesgo de abandono", role: "Juzga si el libro engancha o es demasiado árido: riesgo de que el estudiante lo abandone (y con ello, ventas).", domain: "calidad", iconKey: "smile", labels: ["panel-reader-engagement"], scope: "master" },
];

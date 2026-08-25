/**
 * FRONT MATTER del Master Book — las MISMAS secciones editoriales que el Atlas
 * (identidad de marca = referencia), con copy DOCUMENTAL propio. Reglas de familia:
 *  - NO se nombra a ningún otro formato (p.ej. "Visual Atlas") para no excluir libros futuros.
 *  - El PREFACIO tiene el MISMO número de párrafos que el canonical (Atlas): 6.
 *  - Bibliografía a 2 columnas (canonical Atlas, `.bib`).
 * Reusa el estilo canónico del matter (`.bidx`, `.pg-body`, `.copyr-box`, `.bib`) vía matterCss.
 */

const esc = (s: unknown): string => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Copy documental CURADO de AI-200 (español neutro, sin voseo). Prefacio = 6 párrafos (común a la familia).
 *  Es el OVERRIDE de AI-200: `masterBlocksForCert("AI-200")` lo devuelve byte-idéntico; otros certs
 *  reciben la versión agnóstica de abajo. Ver barrido cross-cert (#3, identidad del master por-cert). */
const AI200_MASTER_BLOCKS = {
  preface: `<p>Estudiar para una certificación cloud suele reducirse a leer documentación y memorizar lo que no se termina de entender. Este libro toma el camino contrario: teje los conceptos del examen AI-200 en una <strong>exposición continua</strong> que explica el porqué, las decisiones de diseño y las trampas, para que el conocimiento se fije con comprensión y no con repetición.</p>
<p>El Master Book es el libro troncal de la colección AI-200: desarrolla cada tema en profundidad y en su contexto. Su valor está en el hilo que conecta los conceptos — cómo una decisión en un servicio condiciona la siguiente — para que llegues al examen razonando, no adivinando.</p>
<p>El AI-200 cubre bastante terreno: contenedores, bases de datos vectoriales, mensajería e integración de servicios backend, con la seguridad y la observabilidad que un caso real exige. Este libro recorre ese terreno como una narrativa, no como una lista de temas sueltos.</p>
<p>Está organizado en <strong>rutas</strong> (los dominios del examen) y <strong>capítulos</strong> (los módulos del temario). Cada capítulo abre con su contexto, desarrolla sus unidades y cierra con los puntos clave; los gráficos aparecen solo donde un esquema fija un concepto que la prosa sola no fija.</p>
<p>Recórrelo por rutas o salta al capítulo que necesites. No se trata de memorizar, sino de entender: cuando puedas reconstruir una decisión de arquitectura con tus palabras, esa parte del examen ya está ganada.</p>
<p>Ten el libro a mano mientras haces simulacros. Cada vez que falles una pregunta, busca el capítulo del tema y repasa su razonamiento — ese ida y vuelta entre práctica y exposición es lo que de verdad fija el conocimiento antes del día del examen.</p>`,
  howto: `<p>Este libro está organizado en <strong>rutas</strong> (los dominios del examen AI-200) y, dentro de cada una, en <strong>capítulos</strong> (los módulos oficiales del temario). Los títulos de las secciones siguen el temario oficial, para que puedas cruzarlo con cualquier otro material de estudio sin perderte.</p>
<ul class="feat">
  <li><strong>Abre-ruta</strong> — presenta el dominio y adelanta sus capítulos.</li>
  <li><strong>Exposición por capítulo</strong> — el desarrollo profundo, sección por sección.</li>
  <li><strong>Figuras complementarias</strong> — diagramas puntuales, numerados y reseñados en el texto.</li>
  <li><strong>Puntos clave</strong> — el cierre para fijar cada capítulo.</li>
</ul>
<p>Lee la exposición con calma, presta atención a las trampas que el examen explota y vuelve a los puntos clave antes de rendir. Ten el libro a mano mientras haces simulacros: cada vez que falles, busca el capítulo del tema y repasa su razonamiento.</p>`,
  conclusions: `<p>Llegaste al final del recorrido. Estas últimas pasadas valen oro:</p>
<ul>
  <li>Repasa los <strong>puntos clave</strong> de cada capítulo — son el destilado de toda la exposición.</li>
  <li>Vuelve a las secciones donde el examen suele tender trampas, con la cabeza puesta en el porqué.</li>
  <li>Resuelve casos y simulacros, y ante cada duda regresa al capítulo que la explica.</li>
</ul>
<p>El examen premia el criterio, no la memoria. Si entiendes por qué cada decisión de diseño es la correcta, ya lo tienes. Descansa la noche anterior y llega con tiempo. Éxitos.</p>`,
} as const;

/**
 * Bloques del front-matter POR CERT. AI-200 conserva su copy curado (byte-idéntico); cualquier otro
 * cert recibe una versión AGNÓSTICA parametrizada por `code` (sin fugas AI-200 ni temas específicos),
 * hasta que tenga su propio copy curado. Prefacio agnóstico = 6 párrafos (regla de familia).
 */
export function masterBlocksForCert(code: string): { preface: string; howto: string; conclusions: string } {
  if (code === "AI-200") return AI200_MASTER_BLOCKS;
  const c = esc(code);
  return {
    preface: `<p>Estudiar para una certificación suele reducirse a leer documentación y memorizar lo que no se termina de entender. Este libro toma el camino contrario: teje los conceptos del examen ${c} en una <strong>exposición continua</strong> que explica el porqué, las decisiones de diseño y las trampas, para que el conocimiento se fije con comprensión y no con repetición.</p>
<p>El Master Book es el libro troncal de la colección ${c}: desarrolla cada tema en profundidad y en su contexto. Su valor está en el hilo que conecta los conceptos — cómo una decisión condiciona la siguiente — para que llegues al examen razonando, no adivinando.</p>
<p>El temario cubre bastante terreno, y este libro lo recorre como una narrativa y no como una lista de temas sueltos: cada concepto llega en el momento en que el anterior lo vuelve necesario.</p>
<p>Está organizado en <strong>rutas</strong> (los dominios del examen) y <strong>capítulos</strong> (los módulos del temario). Cada capítulo abre con su contexto, desarrolla sus unidades y cierra con los puntos clave; los gráficos aparecen solo donde un esquema fija un concepto que la prosa sola no fija.</p>
<p>Recórrelo por rutas o salta al capítulo que necesites. No se trata de memorizar, sino de entender: cuando puedas reconstruir una decisión de diseño con tus palabras, esa parte del examen ya está ganada.</p>
<p>Ten el libro a mano mientras haces simulacros. Cada vez que falles una pregunta, busca el capítulo del tema y repasa su razonamiento — ese ida y vuelta entre práctica y exposición es lo que de verdad fija el conocimiento antes del día del examen.</p>`,
    howto: `<p>Este libro está organizado en <strong>rutas</strong> (los dominios del examen ${c}) y, dentro de cada una, en <strong>capítulos</strong> (los módulos oficiales del temario). Los títulos de las secciones siguen el temario oficial, para que puedas cruzarlo con cualquier otro material de estudio sin perderte.</p>
<ul class="feat">
  <li><strong>Abre-ruta</strong> — presenta el dominio y adelanta sus capítulos.</li>
  <li><strong>Exposición por capítulo</strong> — el desarrollo profundo, sección por sección.</li>
  <li><strong>Figuras complementarias</strong> — diagramas puntuales, numerados y reseñados en el texto.</li>
  <li><strong>Puntos clave</strong> — el cierre para fijar cada capítulo.</li>
</ul>
<p>Lee la exposición con calma y presta atención a las trampas que el examen explota. No hace falta recorrerlo en orden: cada capítulo es autocontenido, así que entra por el tema que más se te resista y sáltate lo que ya domines; los puntos clave del cierre te sirven de repaso rápido cuando vuelvas.</p>`,
    conclusions: AI200_MASTER_BLOCKS.conclusions,
  };
}

/** Página "Contenido del libro": índice de las SECCIONES (no de los capítulos), estilo `.bidx` canónico. */
export function masterContentIndexHtml(entries: { label: string; sub: string }[]): string {
  const rows = entries.map((e) => `<div class="bidx-row"><div class="bidx-t">${esc(e.label)}</div><div class="bidx-d">${esc(e.sub)}</div></div>`).join("");
  return `<div class="bidx">${rows}</div>`;
}

/** Mapeo de dominios del Master (tabla `.dmap` canónica, SIN referencias a otros formatos: "Ruta" / "Dónde hacer foco"). */
export function masterDomainMapHtml(rows: { skill: string; domain: string; notes: string }[], code = "AI-200"): string {
  const body = rows.map((r) => {
    const m = /^(Ruta\s+\d+)\s*[—–-]\s*(.+)$/.exec(r.skill.trim());
    const skillHtml = m ? `<span class="dm-r">${esc(m[1] ?? "")}</span>${esc(m[2] ?? "")}` : esc(r.skill);
    return `<tr><td class="s">${skillHtml}</td><td>${esc(r.notes)}</td></tr>`;
  }).join("");
  return `<p>El examen ${esc(code)} se organiza en dominios con peso distinto. Esta tabla mapea cada ruta a dónde poner el foco al estudiar: prioriza los dominios de mayor peso y las decisiones que el examen evalúa con más frecuencia.</p><table class="dmap"><thead><tr><th>Ruta</th><th>Dónde hacer foco</th></tr></thead><tbody>${body}</tbody></table>`;
}

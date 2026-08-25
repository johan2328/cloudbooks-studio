import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { CONFIG } from "../config.js";
import { atomicWriteFile } from "../fs-safe.js";

/**
 * CONTRATO EDITORIAL — la fuente de verdad del ESTILO del master book: cómo escribe el autor cada
 * capítulo, para que suene a LIBRO editorial premium y NO a ficha técnica ni a texto de IA. Los tres
 * generadores (autor, enriquecedor, capstone) DERIVAN su voz y estructura de acá (no hardcodean), así
 * el contrato es la única fuente de verdad y regenerar da siempre el mismo estilo. Por cert+formato
 * (flip-safe), reproducible y editable, como los demás contratos.
 */
export interface EditorialContract {
  /** Voz del autor: neutro sin voseo, sin muletillas, términos exactos, ejemplo concreto > generalidad. */
  voice: string;
  /** Estructura de párrafos: cortos, una idea, en <p> separados, con progresión (evita muros de texto). */
  paragraphs: string;
  /** Formato de la práctica tipo examen: ejercicios ESTRUCTURADOS; el render pone A/B/C y arma "Soluciones" aparte. */
  practice: string;
  /** Diseño instruccional: el capítulo debe ENSEÑAR (objetivos medibles, worked-examples con porqué, demostrar troubleshooting, alineación, prerrequisitos, metacognición). */
  pedagogy: string;
}

// Contrato AI-200 (con ejemplos Azure en practice/pedagogy). Es el OVERRIDE en código para ai-200 (byte-idéntico
// → mismo edHash → caché de capítulos válida). Otros certs usan DEFAULT_EDITORIAL (agnóstico) de abajo. Barrido Fase 2.
const AI200_EDITORIAL: EditorialContract = {
  voice:
    "GUÍA EDITORIAL (obligatoria): escribe como un LIBRO editorial premium, con criterio de editor, NO como una ficha técnica ni un texto generado por IA. " +
    "(1) ESPAÑOL NEUTRO de Latinoamérica. Trata al lector de USTED de forma CONSISTENTE en TODO (exposición, intros Y prácticas): 'Use/Elija/Configure/Otorgue/Debe/Su equipo'. PROHIBIDO EL TÚ ('debes/tu/necesitas/deseas/quieres/tienes') y PROHIBIDO EL VOSEO ('configurá/usá/elegí/poné'). Nunca mezcles registros. " +
    "(2) Términos técnicos EXACTOS y español correcto: NUNCA inventes palabras; si un concepto no tiene término claro, explícalo en lenguaje llano. " +
    "(3) EVITA las muletillas de relleno ('es fundamental', 'es clave', 'es esencial', 'juega un rol crucial', 'en el mundo actual', 'en la era de'): afirma directo con el dato, el nombre exacto o la acción concreta. " +
    "(4) Voz humana y con criterio; nada de tono enumerativo o frío que delate una plantilla. " +
    "(5) VARÍA las aperturas de sección; no arranques dos secciones igual. " +
    "(6) Prefiere el ejemplo concreto (comando, valor, decisión 'cuándo usar qué') a la generalidad. " +
    "(7) ENGANCHE (sin marketing): abre los capítulos y las secciones por lo que está EN JUEGO para el lector —el problema real, la decisión que enfrentará, el error que se evita—, conecta con su trabajo y haz sentir el 'por qué importa', en lenguaje llano y humano. La meta es que el estudiante NO abandone: rigor sí, aridez no. PROHIBIDO el relleno motivacional vacío, el tono de venta y las muletillas.",
  paragraphs:
    "ESTRUCTURA DE PÁRRAFOS (obligatoria): escribe en párrafos CORTOS de 3 a 6 líneas, UNA idea por párrafo, cada uno en su propio <p>. " +
    "Las ideas PROGRESAN de un párrafo al siguiente (contexto → decisión → consecuencia / cuándo conviene). " +
    "PROHIBIDO un <p> gigante o un muro de texto que encadene muchas ideas: si un párrafo pasa de ~7 líneas o mezcla temas, pártelo en dos o más <p> con ideas distintas. Cada sección son varios <p> cortos, no uno largo. " +
    "ESCANEABILIDAD (obligatoria — baja la carga cognitiva): cuando enumeres 3 o más elementos, pasos, opciones, criterios o comandos, usa una LISTA <ul>/<ol> (o una tabla de decisión <table class=\"dmap\"> para 'cuándo usar qué'), NUNCA un párrafo corrido que los encadene con comas o 'y'. Rompe los muros de prosa con listas, tablas y callouts (<div class=\"tip\">…</div> para 'En el laboratorio', <div class=\"exam-trap\">…</div> para la trampa). El lector debe poder ESCANEAR la estructura de un vistazo antes de leer. " +
    "PROFUNDIDAD POR SECCIÓN (obligatoria): la brevedad es por PÁRRAFO, NO por sección. Cada sección DESARROLLA su unidad a fondo —cubre sus aspectos importantes con datos, decisiones, worked examples y casos borde que la fuente respalde—, NO se queda en dos o tres párrafos que rozan el tema. Sub-desarrollar una sección respecto de lo que la fuente permite es un defecto tan grave como el relleno: la meta es COBERTURA sustancial, no palabras de más.",
  practice:
    "FORMATO DE PRÁCTICA (obligatorio): la práctica es un ARREGLO ESTRUCTURADO de 3-4 ejercicios tipo examen AI-200 (NO HTML), con FORMATOS VARIADOS que emulan el examen real. Cada ejercicio lleva 'kind' + 'question' (ESCENARIO realista, 2-3 frases: contexto + una decisión concreta) + 'explanation' (por qué la respuesta correcta lo es y, breve, por qué las otras no; cierra nombrando el TEMA a repasar por su nombre, p.ej. 'repase la selección de SKU de ACR', NUNCA un id interno tipo 's1'/'s2'). Según 'kind' agrega los campos: " +
    "• 'single' = opción múltiple de UNA respuesta: 'options' (3-4 opciones plausibles, texto plano SIN letras/números al inicio — el sistema pone A/B/C) + 'correctIndex' (0-based). " +
    "• 'multi' = respuesta múltiple ('elija todas las que apliquen'): 'options' (4-5) + 'correctIndices' (arreglo 0-based de las 2-3 correctas). " +
    "• 'order' = ordenar pasos (secuencia de comandos az o pasos de un flujo): 'steps' = arreglo con la SECUENCIA CORRECTA de 3-5 pasos (el sistema los BARAJA; el lector los ordena). Cada paso una acción o comando corto y REAL. " +
    "• 'build' = completar código/config: 'template' = un fragmento CORTO de código/config con huecos marcados EXACTAMENTE como [[1]] [[2]] (2-3 huecos) + 'blanks' = arreglo, uno por hueco EN ORDEN, cada uno con 'options' (2-3 valores plausibles, texto plano) + 'correctIndex' (0-based). " +
    "MEZCLA (obligatoria): entre los ejercicios del capítulo USA AL MENOS 2 'kind' distintos e INCLUÍ SIEMPRE uno de 'order' o 'build' (el hands-on con CLI/código, donde el examen evalúa habilidad práctica). NUNCA reveles la correcta dentro de una opción/paso/valor ni la marques: la resolución la arma el sistema aparte. " +
    "DISEÑO DE ÍTEMS (obligatorio): (a) COBERTURA — habilidades ENFATIZADAS DISTINTAS del capítulo, no una sola; (b) VARIEDAD — NO repitas el mismo concepto entre ejercicios ni respecto de otros capítulos (nada de dos ítems casi idénticos de WEBSITES_PORT o de Managed Identity/AcrPull); (c) DISTRACTORES DIAGNÓSTICOS — cada opción/paso/valor incorrecto es una MISCONCEPTION real que el examen castiga, NO un descarte trivial ('activar Always-on', 'subir la SKU por memoria'); (d) CLI/CÓDIGO REAL — los comandos y valores de 'order'/'build' deben ser CORRECTOS y vigentes; se verifican contra la fuente en un gate INDEPENDIENTE y, si inventás un comando o valor, el ejercicio se DESCARTA.",
  pedagogy:
    "DISEÑO INSTRUCCIONAL (obligatorio — el capítulo debe ENSEÑAR, no resumir): " +
    "(1) OBJETIVOS medibles: 3-5 objetivos OBSERVABLES con verbo de acción ('Seleccionar el SKU de ACR dados requisitos de red/throughput'; 'Diagnosticar un contenedor que no arranca siguiendo la secuencia startup→pull→health'), NUNCA sinopsis en futuro ('usted aprenderá…'). " +
    "(2) WORKED EXAMPLES con el PORQUÉ: cada bloque de código crítico explica el razonamiento de los pasos clave (por qué ese scope, por qué ese rol, qué es cada valor), no solo el 'qué'. " +
    "(3) DEMOSTRAR, no enunciar: las habilidades diagnósticas (troubleshooting) se DEMUESTRAN con un ejemplo REAL (salida de log stdout/stderr, código de salida) y el razonamiento paso a paso hasta la causa — nunca solo la regla abstracta 'verifique en orden…'. " +
    "(4) ALINEACIÓN CONSTRUCTIVA: TODA habilidad que el capítulo enfatiza debe practicarse/evaluarse (si enseña selección de SKU, retención/purga con acr purge, troubleshooting o Key Vault, debe haber práctica de eso, no solo de WEBSITES_PORT). " +
    "(5) PRERREQUISITOS ACCIONABLES: cuando el capítulo asume base, actívala con ACCIONES concretas de preparación ('tenga a mano un Dockerfile con CMD/ENTRYPOINT', 'inicie sesión con az acr login', 'cuente con una imagen construida'), NUNCA una lista de tecnologías sueltas; y agrega una cápsula de repaso ('¿sin base en X? repase Y antes de seguir'). Va en los campos 'prerequisites'/'prereqRemedy', NUNCA repetido en la prosa; es material EDITORIAL (no un claim del corpus, no se gatea por grounding). " +
    "(6) METACOGNICIÓN: al menos una 'Trampa del examen' por capítulo (una misconception real) y 'Puntos clave' redactados como checklist de autoevaluación COMPACTA (3-5 ítems, sin repetir lo ya dicho textualmente). " +
    "ANTI-DUPLICACIÓN de rótulos (obligatorio): 'Puntos clave' y 'Trampa del examen' aparecen UNA sola vez cada uno. Los 'Puntos clave' los arma el sistema al CIERRE desde el campo keyTakeaways: NUNCA escribas un rótulo ni un párrafo 'Puntos clave:' dentro de la prosa de una sección. La 'Trampa del examen' va UNA sola vez como callout <div class=\"exam-trap\"><p class=\"lab\">Trampa del examen</p><p>…</p></div>: NO escribas además un 'Trampa del examen:' inline ni repitas la misma trampa en dos lugares. " +
    "(7) SALIDA ESPERADA (micro-ejemplos, baja la carga cognitiva): junto a cada comando o bloque de código CRÍTICO, agrega en UNA línea breve QUÉ debe pasar o QUÉ MIRAR para confirmar el resultado ('→ imprime el digest sha256:…'; '→ si el exit code es 1, revise el ENTRYPOINT'); cuando aporte, muestra un fragmento REAL de salida en vez de describirla. El lector confirma sin adivinar. " +
    "(8) BLOQUES DE CÓDIGO ACOTADOS (obligatorio): ningún bloque de código supera ~½ página (~12-15 líneas). Si un ejemplo es más largo, PÁRTELO en fragmentos cortos, cada uno introducido o seguido por 1-2 frases de prosa que expliquen QUÉ hace y POR QUÉ ese valor/paso. NUNCA un volcado de código de página entera sin intervención de prosa (el lector lo saltea y no aprende). Sólo un artefacto COMPLETO para copiar-pegar (un Dockerfile, un Bicep) puede ser más largo, y aun así introdúcelo y resalta las líneas clave; prefiere el FRAGMENTO relevante, no el archivo entero.",
};

// Contrato AGNÓSTICO (default para cualquier cert sin override). Mismos principios que AI-200 pero SIN ejemplos
// Azure (ACR/WEBSITES_PORT/az/Dockerfile/Bicep) → no desvía al autor de un cert no-Azure. voice/paragraphs se
// comparten con AI-200 (ya eran agnósticos, byte-idénticos). Un cert afina lo suyo vía `_editorial-contract.{cert}.{fmt}.json`.
export const DEFAULT_EDITORIAL: EditorialContract = {
  voice: AI200_EDITORIAL.voice,
  paragraphs: AI200_EDITORIAL.paragraphs,
  practice:
    "FORMATO DE PRÁCTICA (obligatorio): la práctica es un ARREGLO ESTRUCTURADO de 3-4 ejercicios tipo examen de la certificación (NO HTML), con FORMATOS VARIADOS que emulan el examen real. Cada ejercicio lleva 'kind' + 'question' (ESCENARIO realista, 2-3 frases: contexto + una decisión concreta) + 'explanation' (por qué la respuesta correcta lo es y, breve, por qué las otras no; cierra nombrando el TEMA a repasar por su nombre, p.ej. 'repase el criterio de selección del tema', NUNCA un id interno tipo 's1'/'s2'). " +
    "• 'single' = opción múltiple de UNA respuesta: 'options' (3-4 opciones plausibles, texto plano SIN letras/números al inicio — el sistema pone A/B/C) + 'correctIndex' (0-based). " +
    "• 'multi' = respuesta múltiple ('elija todas las que apliquen'): 'options' (4-5) + 'correctIndices' (arreglo 0-based de las 2-3 correctas). " +
    "• 'order' = ordenar pasos (una secuencia de comandos, acciones o pasos de un procedimiento/flujo): 'steps' = arreglo con la SECUENCIA CORRECTA de 3-5 pasos (el sistema los BARAJA; el lector los ordena). Cada paso una acción o comando corto y REAL. " +
    "• 'build' = completar código/config: 'template' = un fragmento CORTO de código/config con huecos marcados EXACTAMENTE como [[1]] [[2]] (2-3 huecos) + 'blanks' = arreglo, uno por hueco EN ORDEN, cada uno con 'options' (2-3 valores plausibles, texto plano) + 'correctIndex' (0-based). " +
    "MEZCLA (obligatoria): entre los ejercicios del capítulo USA AL MENOS 2 'kind' distintos e INCLUÍ SIEMPRE uno de 'order' o 'build' (el hands-on, donde el examen evalúa habilidad práctica). NUNCA reveles la correcta dentro de una opción/paso/valor ni la marques: la resolución la arma el sistema aparte. " +
    "DISEÑO DE ÍTEMS (obligatorio): (a) COBERTURA — habilidades ENFATIZADAS DISTINTAS del capítulo, no una sola; (b) VARIEDAD — NO repitas el mismo concepto entre ejercicios ni respecto de otros capítulos (nada de dos ítems casi idénticos sobre el mismo parámetro o mecanismo); (c) DISTRACTORES DIAGNÓSTICOS — cada opción/paso/valor incorrecto es una MISCONCEPTION real que el examen castiga, NO un descarte trivial (una opción obviamente ajena al escenario); (d) CÓDIGO/PASOS REALES — los comandos y valores de 'order'/'build' deben ser CORRECTOS y vigentes; se verifican contra la fuente en un gate INDEPENDIENTE y, si inventás un comando o valor, el ejercicio se DESCARTA.",
  pedagogy:
    "DISEÑO INSTRUCCIONAL (obligatorio — el capítulo debe ENSEÑAR, no resumir): " +
    "(1) OBJETIVOS medibles: 3-5 objetivos OBSERVABLES con verbo de acción ('Seleccionar la opción adecuada dados los requisitos del escenario'; 'Diagnosticar una falla siguiendo una secuencia de verificación'), NUNCA sinopsis en futuro ('usted aprenderá…'). " +
    "(2) WORKED EXAMPLES con el PORQUÉ: cada bloque de código o procedimiento crítico explica el razonamiento de los pasos clave (por qué ese alcance, por qué ese valor, qué hace cada parte), no solo el 'qué'. " +
    "(3) DEMOSTRAR, no enunciar: las habilidades diagnósticas (troubleshooting) se DEMUESTRAN con un ejemplo REAL (un mensaje de error, una salida, un código de estado) y el razonamiento paso a paso hasta la causa — nunca solo la regla abstracta 'verifique en orden…'. " +
    "(4) ALINEACIÓN CONSTRUCTIVA: TODA habilidad que el capítulo enfatiza debe practicarse/evaluarse; si el capítulo enfatiza una habilidad concreta, debe haber práctica de ESA habilidad, no solo de la más fácil de examinar. " +
    "(5) PRERREQUISITOS ACCIONABLES: cuando el capítulo asume base, actívala con ACCIONES concretas de preparación ('tenga a mano el insumo o artefacto que el capítulo asume', 'complete el paso de configuración previo', 'cuente con el entorno o los permisos necesarios'), NUNCA una lista de tecnologías sueltas; y agrega una cápsula de repaso ('¿sin base en X? repase Y antes de seguir'). Va en los campos 'prerequisites'/'prereqRemedy', NUNCA repetido en la prosa; es material EDITORIAL (no un claim del corpus, no se gatea por grounding). " +
    "(6) METACOGNICIÓN: al menos una 'Trampa del examen' por capítulo (una misconception real) y 'Puntos clave' redactados como checklist de autoevaluación COMPACTA (3-5 ítems, sin repetir lo ya dicho textualmente). " +
    "ANTI-DUPLICACIÓN de rótulos (obligatorio): 'Puntos clave' y 'Trampa del examen' aparecen UNA sola vez cada uno. Los 'Puntos clave' los arma el sistema al CIERRE desde el campo keyTakeaways: NUNCA escribas un rótulo ni un párrafo 'Puntos clave:' dentro de la prosa de una sección. La 'Trampa del examen' va UNA sola vez como callout <div class=\"exam-trap\"><p class=\"lab\">Trampa del examen</p><p>…</p></div>: NO escribas además un 'Trampa del examen:' inline ni repitas la misma trampa en dos lugares. " +
    "(7) SALIDA ESPERADA (micro-ejemplos, baja la carga cognitiva): junto a cada comando o bloque de código CRÍTICO, agrega en UNA línea breve QUÉ debe pasar o QUÉ MIRAR para confirmar el resultado ('→ confirme que aparece el resultado esperado'; '→ si falla, revise el paso previo'); cuando aporte, muestra un fragmento REAL de salida en vez de describirla. El lector confirma sin adivinar. " +
    "(8) BLOQUES DE CÓDIGO ACOTADOS (obligatorio): ningún bloque de código supera ~½ página (~12-15 líneas). Si un ejemplo es más largo, PÁRTELO en fragmentos cortos, cada uno introducido o seguido por 1-2 frases de prosa que expliquen QUÉ hace y POR QUÉ ese valor/paso. NUNCA un volcado de código de página entera sin intervención de prosa (el lector lo saltea y no aprende). Sólo un artefacto COMPLETO para copiar-pegar (un archivo de configuración, un script) puede ser más largo, y aun así introdúcelo y resalta las líneas clave; prefiere el FRAGMENTO relevante, no el archivo entero.",
};

// AI-200 usa su contrato con ejemplos Azure; el resto, el agnóstico. Base ANTES de mergear el override persistido.
const EDITORIAL_BY_CERT: Record<string, EditorialContract> = { "ai-200": AI200_EDITORIAL };
function baseEditorial(): EditorialContract { return EDITORIAL_BY_CERT[CONFIG.certId] ?? DEFAULT_EDITORIAL; }

const FILE = (): string => path.join(CONFIG.outputRoot, `_editorial-contract.${CONFIG.certId}.${CONFIG.format}.json`);

export function getEditorialContract(): EditorialContract {
  const base = baseEditorial();
  try {
    if (existsSync(FILE())) return { ...base, ...(JSON.parse(readFileSync(FILE(), "utf8")) as Partial<EditorialContract>) };
  } catch { /* corrupto → default */ }
  return { ...base };
}

export async function saveEditorialContract(patch: Partial<EditorialContract>): Promise<EditorialContract> {
  const next = { ...getEditorialContract(), ...patch };
  await atomicWriteFile(FILE(), JSON.stringify(next, null, 2), "editorial-contract");
  return next;
}

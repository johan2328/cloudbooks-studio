import { CONFIG } from "../config.js";
import { getOpenAI, hasOpenAIKey } from "../openai-client.js";
import { recordTextSpend, wouldExceedCap } from "../cost.js";
import type { PageSeed } from "../types.js";
import { PAGE1_MAX, type InfographicPart } from "./build-infographic-prompt.js";

/**
 * QA de visión A CIEGAS de la infografía generada. El modelo LEE la imagen sin
 * que le digamos la verdad (para no sesgarlo a confirmar lo que espera) y reporta
 * qué opción del autocheck quedó resaltada y si hay texto garabateado. RECIÉN
 * DESPUÉS comparamos en código contra la verdad verificada del seed. Si la opción
 * resaltada ≠ la correcta, o hay garabatos → la imagen se rechaza (re-roll).
 */
export interface InfographicQa {
  ran: boolean;
  highlightedLetter: string | null;   // lo que el QA LEYÓ resaltado (A/B/C/D)
  expectedLetter: string;             // la correcta según la verdad
  answerMatches: boolean;             // resaltada == correcta
  garbled: boolean;                   // texto ilegible/gibberish
  garbledSamples: string[];
  doubleLetter: boolean;             // ⚠ una opción muestra su letra duplicada ("A. A.")
  // ── Conformidad de estilo (control de varianza vs el contrato) ──
  cardsWhite: boolean;                // tarjetas con fondo blanco (no tintado)
  saturationOk: boolean;              // colores planos de marca, sin sobre-saturación/neón
  numberingOk: boolean;               // badges circulares de color con número blanco
  bordersOk: boolean;                 // bordes finos grises redondeados, consistentes (bandas CON borde)
  bandsSeparated: boolean;            // ⚠ trampas y autocheck = bloques separados con gap; bordes no se tocan/funden
  guidePin: boolean;                  // la guía marcada con pin azul (no círculo de "?")
  guideAligned: boolean;             // ⚠ pin+etiqueta a la izq, texto a la der en línea; el texto NO va bajo el pin
  correctIsGreen: boolean;            // la opción correcta resaltada en verde con tilde
  contentBleed: boolean;             // ⚠ contenido/tabla que NO corresponde a esta página (filtrado del ancla)
  edgeClipped: boolean;              // ⚠ contenido cortado por el borde del lienzo (esp. opción D / explicación)
  fidelityIssues: string[];          // ⚠ tarjetas que dibujan servicios/íconos/temas NO mencionados en su texto (invención)
  conformanceIssues: string[];
  // ── Gobierno del proceso (taxonomía de controles) ──
  criticalFailures: string[];        // BLOQUEAN: contenido incorrecto/filtrado/garabato → re-roll obligatorio
  styleFailures: string[];           // PREMIUM: blancas/saturación/verde → re-roll si quedan intentos
  advisory: string[];                // MENORES: numeración/bordes/pin → se reportan, no re-roll
  correctiveHint: string;            // qué corregir, para inyectar en el re-roll (mejora dirigida)
  ok: boolean;                        // sin fallas críticas ni de estilo
  notes: string;
}

function letter(i: number): string { return String.fromCharCode(65 + i); }

export async function infographicQa(buffer: Buffer, seed: PageSeed, part: InfographicPart = "single"): Promise<InfographicQa> {
  // Modelo overflow: pág 1 (A) = SOLO las primeras 6 tarjetas; pág 2 (B) = tarjetas restantes
  // + trampas + autocheck; single (≤7) = todo. Todas las partes tienen tarjetas.
  const hasModules = true;
  const hasChecks = part !== "A";
  const hasGuide = part !== "B";   // la pág 2 (slim) NO tiene pregunta guía ni hero
  const partMods = part === "A" ? seed.visualModules.slice(0, PAGE1_MAX)
    : part === "B" ? seed.visualModules.slice(PAGE1_MAX)
    : seed.visualModules.slice(0, 7);
  const expectedLetter = letter(seed.autocheck.correctOption);
  const base: InfographicQa = {
    ran: false, highlightedLetter: null, expectedLetter, answerMatches: false,
    garbled: false, garbledSamples: [], doubleLetter: false,
    cardsWhite: true, saturationOk: true, numberingOk: true, bordersOk: true, bandsSeparated: true, guidePin: true, guideAligned: true, correctIsGreen: true,
    contentBleed: false, edgeClipped: false, fidelityIssues: [], conformanceIssues: [],
    criticalFailures: [], styleFailures: [], advisory: [], correctiveHint: "", ok: false, notes: "",
  };
  if (!hasOpenAIKey()) return { ...base, notes: "sin llave OpenAI" };
  if (wouldExceedCap(0.01)) return { ...base, notes: "tope de costo" };
  const openai = getOpenAI();
  if (!openai) return { ...base, notes: "cliente no disponible" };

  const nModules = Math.max(2, partMods.length || 4);   // tarjetas que muestra ESTA página
  const startNum = part === "B" ? PAGE1_MAX + 1 : 1;
  const gridDesc = nModules === 2 ? "2 columnas altas que llenan todo el rectángulo"
    : nModules === 3 ? "2 tarjetas arriba + 1 ancha abajo (sin hueco)"
    : nModules === 4 ? "grilla 2x2" : nModules === 5 ? "fila de 3 + fila de 2 centrada"
    : nModules === 6 ? "grilla 2x3" : nModules === 7 ? "fila de 4 arriba + fila de 3 centrada abajo" : "filas de 4 (izq→der)";
  const topics = partMods.map((m) => m.title).join(" | ");
  const sectionsBlock = partMods.map((m, i) => `  ${startNum + i}. "${m.title}": ${m.description}`).join("\n");
  const zonesNote = part === "A"
    ? `\nESTA PÁGINA es la PÁGINA 1 de un spread: muestra SOLO el título, la pregunta guía y las primeras ${nModules} TARJETAS NUMERADAS de conceptos a página completa. NO tiene banda de "TRAMPAS DEL EXAMEN" ni "VERIFICACIÓN AUTOCHECK" — NO las busques, NO penalices su ausencia, dejá opcion_resaltada:"ninguna" y trampa/autocheck ok=true.`
    : part === "B"
    ? `\nESTA PÁGINA es la PÁGINA 2 (continuación) de un spread: tiene un HEADER SLIM (solo una línea de título, SIN ícono grande de hero, SIN contexto, SIN pregunta guía), luego ${nModules} tarjetas numeradas (las que siguen a la 6, numeradas desde ${startNum}), luego las TRAMPAS y el AUTOCHECK. NO penalices la ausencia del ícono de hero ni de la pregunta guía (no van en esta página). Auditá las tarjetas, las trampas y el autocheck normalmente.`
    : "";
  const sys = "Sos QA de visión + DIRECTOR DE ARTE de una colección premium. Leés SOLO lo dibujado (no infieras el contenido) y además auditás el ESTILO contra un contrato fijo. Respondés SOLO JSON.";
  const user = `Página de estudio premium (estilo Microsoft Learn). El TEMA de esta página y sus secciones es: "${seed.title}" — secciones: ${topics}.${zonesNote} Auditá CUATRO cosas:
(1) CONTENIDO (leé literal, no supongas): en "Verificación autocheck" (opciones A,B,C,D) ¿cuál está resaltada como correcta? ¿hay texto ilegible/garabateado/inventado? ¿alguna opción muestra su letra DUPLICADA, ej "A. A." o "B. B."? → letra_duplicada.
(1b) CONTENIDO FILTRADO: ¿hay alguna TABLA o bloque de datos que NO corresponde a este tema/secciones (parece copiado de otra página, p.ej. una tabla de "tiers/SKUs" en una página que no trata de eso)? → contenido_filtrado.
(1c) CONTENIDO CORTADO POR EL BORDE: mirá el BORDE DERECHO. En la fila de opciones del autocheck, ¿se ven las CUATRO opciones (A, B, C y D) COMPLETAS con su texto, o la última (D) está cortada / vacía / se sale del borde derecho del lienzo? ¿La línea "Explicación:" tiene alguna palabra cortada en el borde derecho? Cualquier texto, tarjeta u opción recortada por cualquier borde → contenido_cortado. → contenido_cortado.
(2) ESTILO vs el contrato fijo — respondé true SOLO si se cumple:
 - cards_blancas: las tarjetas de sección tienen fondo BLANCO (no tintado de color).
 - saturacion_ok: los colores son PLANOS y sobrios (paleta de marca), SIN sobre-saturación, brillo ni neón.
 - numeracion_ok: cada sección abre con un CÍRCULO de color con número BLANCO, y CADA tarjeta usa un acento DISTINTO en este orden (1 azul, 2 violeta, 3 teal, 4 naranja, 5 magenta, 6 índigo, 7 rosa, 8 ámbar) — el número Y el título de cada tarjeta van en SU acento. Responder FALSE si TODAS las tarjetas (o varias) usan el MISMO color (ej. todas moradas) en vez de la secuencia, o si los acentos no varían tarjeta por tarjeta. Esta página tiene ${nModules} secciones (disposición: ${gridDesc}); NO es un defecto que sean ${nModules} y no 4.
 - bloque_lleno: el bloque de secciones numeradas LLENA todo su rectángulo SIN cuadrantes vacíos, huecos ni espacio en blanco grande. CRÍTICO con 2–3 secciones: con 3, lo correcto es 2 tarjetas arriba + 1 ANCHA abajo (NO una grilla 2×2 con la 4ª celda vacía); con 2, son 2 columnas ALTAS lado a lado. Responder false si hay un cuadrante vacío, un hueco o una tarjeta suelta con blanco al lado.
 - bordes_ok: las tarjetas Y las bandas (trampas, autocheck) tienen su borde fino redondeado VISIBLE y consistente. Responder false si alguna banda/tarjeta aparece SIN borde (suelta, sin contorno).
 - bandas_separadas: las bandas "TRAMPAS DEL EXAMEN" y "VERIFICACIÓN AUTOCHECK" son DOS bloques SEPARADOS por un espacio blanco claro entre ellas; sus bordes NO se tocan ni se funden. Responder false si los bordes de las dos bandas se pegan/tocan, se superponen, o no hay separación blanca clara entre una banda y la otra.
 - guia_pin: la "Pregunta guía" está marcada con un PIN azul de mapa (NO un círculo con "?").
 - guia_alineada: en la "Pregunta guía", el pin azul y la etiqueta "PREGUNTA GUÍA" están a la IZQUIERDA y el texto de la pregunta está a la DERECHA del divisor, todo alineado en la misma línea base. Responder false si el texto de la pregunta se corre DEBAJO del ícono del pin, queda en una esquina superior, o el pin/etiqueta/texto están desalineados (no comparten línea).
 - guia_una_linea: la pregunta de la "Pregunta guía" entra en UNA sola línea (la banda NO creció a dos líneas / no es más alta).
 - trampa_icono_ok: el ícono del encabezado "TRAMPAS DEL EXAMEN" es un TRIÁNGULO ROJO SÓLIDO (relleno) con un "!" blanco adentro — responder false si es un triángulo solo de contorno, otra forma, o un círculo.
 - iconos_unicos: cada tarjeta numerada usa un ícono/diagrama DISTINTO y ninguna tarjeta repite el ÍCONO GRANDE del encabezado (la nube+registro de arriba). Responder false si ese ícono del header se repite dentro de alguna tarjeta, o si el MISMO ícono aparece en más de una tarjeta.
 - texto_autocheck_ok: en "Verificación autocheck", el texto de la PREGUNTA y el de la EXPLICACIÓN están en gris/negro REGULAR (NO en azul, NO en negrita) — solo las etiquetas "Pregunta:" y "Explicación:" pueden estar en negrita/color. Responder false si el texto de la pregunta o la explicación está en azul o en negrita.
 - correcta_verde: la opción correcta está resaltada en VERDE con tilde.
(3) FIDELIDAD AL CONTENIDO (importante): cada tarjeta numerada debe dibujar SOLO los servicios/conceptos que dice SU PROPIO texto. El texto real de cada sección es:
${sectionsBlock}
Mirá los ÍCONOS y diagramas de cada tarjeta y comparalos con su texto. Listá en "secciones_infieles" cada sección cuyo dibujo AGREGA servicios/íconos de Azure que su texto NO menciona, o que muestra un tema distinto al de su título. Ejemplo: una tarjeta cuyo texto dice "se integra con Kubernetes y Container Apps" pero dibuja además Key Vault o App Service → es infiel (esos no están en su texto). Formato: [{"seccion":N,"dibuja_de_mas":"qué íconos/servicios sobran"}]. Si todas las tarjetas coinciden con su texto, devolvé [].
Devolvé EXACTO: {"opcion_resaltada":"A|B|C|D|ninguna","texto_garabateado":true|false,"ejemplos_garabato":["..."],"letra_duplicada":true|false,"contenido_filtrado":true|false,"contenido_cortado":true|false,"cards_blancas":true|false,"saturacion_ok":true|false,"numeracion_ok":true|false,"bloque_lleno":true|false,"bordes_ok":true|false,"bandas_separadas":true|false,"guia_pin":true|false,"guia_alineada":true|false,"guia_una_linea":true|false,"trampa_icono_ok":true|false,"iconos_unicos":true|false,"texto_autocheck_ok":true|false,"correcta_verde":true|false,"secciones_infieles":[{"seccion":1,"dibuja_de_mas":"..."}],"desvios":["..."]}`;

  try {
    const res = await openai.chat.completions.create({
      model: CONFIG.visionModel,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: [
          { type: "text", text: user },
          { type: "image_url", image_url: { url: `data:image/png;base64,${buffer.toString("base64")}`, detail: "high" } },
        ] },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
      max_tokens: 800, // 300 truncaba el JSON del QA cuando hay hallazgos (array secciones_infieles) → falso negativo
    });
    recordTextSpend(CONFIG.visionModel, res.usage, { kind: "vision", pageId: seed.pageId, label: "infographic-qa" });
    const raw = JSON.parse(res.choices[0]?.message?.content ?? "{}") as Record<string, unknown>;
    const hl = typeof raw.opcion_resaltada === "string" ? raw.opcion_resaltada.trim().toUpperCase().charAt(0) : "";
    const highlightedLetter = ["A", "B", "C", "D"].includes(hl) ? hl : null;
    const garbled = raw.texto_garabateado === true;
    const garbledSamples = Array.isArray(raw.ejemplos_garabato) ? raw.ejemplos_garabato.map(String).slice(0, 5) : [];
    const doubleLetter = raw.letra_duplicada === true;
    const answerMatches = highlightedLetter === expectedLetter;
    const b = (k: string): boolean => raw[k] !== false;   // ausente = asumimos cumple (no penalizar por falta de dato)
    const cardsWhite = b("cards_blancas"), saturationOk = b("saturacion_ok"), numberingOk = b("numeracion_ok");
    const bordersOk = b("bordes_ok"), guidePin = b("guia_pin"), correctIsGreen = b("correcta_verde");
    const bandsSeparated = b("bandas_separadas"), guideAligned = b("guia_alineada");
    const guideOneLine = b("guia_una_linea"), trapIconOk = b("trampa_icono_ok"), autocheckTextOk = b("texto_autocheck_ok"), iconsUnique = b("iconos_unicos");
    const blockFilled = b("bloque_lleno");
    const contentBleed = raw.contenido_filtrado === true;
    const edgeClipped = raw.contenido_cortado === true;
    const conformanceIssues = Array.isArray(raw.desvios) ? raw.desvios.map(String).slice(0, 8) : [];
    // FIDELIDAD: tarjetas que dibujan servicios/íconos que su texto no menciona.
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const fidelityRaw = Array.isArray(raw.secciones_infieles) ? (raw.secciones_infieles as any[]) : [];
    const fidelityIssues = fidelityRaw.slice(0, 6)
      .map((x) => { const sec = x?.seccion != null ? `Sección ${x.seccion}` : "Una sección"; const extra = String(x?.dibuja_de_mas ?? "").trim(); return extra ? `${sec}: dibuja de más ${extra}` : ""; })
      .filter(Boolean);
    /* eslint-enable @typescript-eslint/no-explicit-any */

    // ── GOBIERNO DEL PROCESO: taxonomía de controles ──
    // CRÍTICOS (corrección/integridad del contenido) → re-roll obligatorio y, si no
    // se resuelven, la página NO se publica (queda para revisión humana).
    // (En un spread, A solo tiene módulos y B solo trampas/autocheck → se ignoran las fallas de la zona ausente.)
    const criticalFailures: string[] = [];
    if (hasChecks && !answerMatches) criticalFailures.push(`opción correcta mal resaltada (resaltó ${highlightedLetter ?? "ninguna"}, debe ser ${expectedLetter})`);
    if (garbled) criticalFailures.push("texto garabateado/ilegible");
    if (hasChecks && doubleLetter) criticalFailures.push("letra de opción duplicada (ej 'A. A.')");
    if (contentBleed) criticalFailures.push("contenido/tabla filtrado de otra página");
    if (edgeClipped) criticalFailures.push("contenido cortado por el borde (opción/tarjeta/explicación recortada)");
    // ESTILO (premium) → re-roll si quedan intentos.
    const styleFailures: string[] = [];
    if (!cardsWhite) styleFailures.push("tarjetas tintadas (deben ser blancas)");
    if (!saturationOk) styleFailures.push("sobre-saturación");
    if (hasChecks && !correctIsGreen) styleFailures.push("la correcta no está resaltada en verde");
    if (hasChecks && !trapIconOk) styleFailures.push("ícono de trampas inconsistente (debe ser triángulo rojo SÓLIDO con '!')");
    if (hasModules && !iconsUnique) styleFailures.push("ícono del header repetido en una tarjeta (o un ícono repetido entre tarjetas) — cada tarjeta debe usar un ícono DISTINTO y el ícono grande del encabezado NO va dentro de las tarjetas");
    if (hasChecks && !autocheckTextOk) styleFailures.push("texto de pregunta/explicación en azul o negrita (debe ser gris oscuro regular; solo las etiquetas van en color)");
    if (!bordersOk) styleFailures.push("bandas/tarjetas sin borde visible o inconsistente — cada banda (trampas, autocheck) y cada tarjeta lleva su borde fino redondeado");
    if (hasChecks && !bandsSeparated) styleFailures.push("bordes de TRAMPAS y AUTOCHECK pegados/fundidos — deben ser DOS bloques separados por un gap blanco claro, sin tocarse");
    if (hasGuide && !guideAligned) styleFailures.push("pregunta guía desalineada (el texto se corre bajo el pin o a una esquina) — pin+etiqueta a la izquierda, texto a la derecha en la MISMA línea base");
    if (hasModules && !blockFilled) styleFailures.push("bloque de secciones con hueco/cuadrante vacío — llená TODO el rectángulo según la cantidad (sin celdas vacías)");
    if (hasModules && !numberingOk) styleFailures.push("acentos sin variar: cada tarjeta debe usar un color DISTINTO en orden (1 azul, 2 violeta, 3 teal, 4 naranja, 5 magenta, 6 índigo, 7 rosa, 8 ámbar) — NO todas del mismo color");
    if (hasModules && fidelityIssues.length) styleFailures.push(`infidelidad: ${fidelityIssues.join(" · ")}`);
    // ADVISORY (matices) → se reportan, NO disparan re-roll.
    const advisory: string[] = [];
    if (hasGuide && !guidePin) advisory.push("guía sin pin azul");
    if (hasGuide && !guideOneLine) advisory.push("pregunta guía en dos líneas (debe entrar en una)");

    const ok = criticalFailures.length === 0 && styleFailures.length === 0;
    const fidelityHint = fidelityIssues.length ? ` Para las tarjetas infieles, dibujá ÚNICAMENTE los servicios que nombra el texto de esa sección y NO agregues ningún otro ícono de servicio: ${fidelityIssues.join("; ")}.` : "";
    const correctiveHint = ok ? "" : `PREVIOUS ATTEMPT HAD THESE PROBLEMS — FIX THEM: ${[...criticalFailures, ...styleFailures].join("; ")}.${fidelityHint}`;
    return {
      ran: true, highlightedLetter, expectedLetter, answerMatches, garbled, garbledSamples, doubleLetter,
      cardsWhite, saturationOk, numberingOk, bordersOk, bandsSeparated, guidePin, guideAligned, correctIsGreen, contentBleed, edgeClipped, fidelityIssues, conformanceIssues,
      criticalFailures, styleFailures, advisory, correctiveHint, ok,
      notes: ok ? "OK: contenido correcto + estilo conforme."
        : `${criticalFailures.length ? "CRÍTICO" : "estilo"} → re-roll: ${[...criticalFailures, ...styleFailures].join("; ")}.`,
    };
  } catch (err) {
    return { ...base, ran: false, notes: `QA falló: ${String((err as Error)?.message ?? err)}` };
  }
}

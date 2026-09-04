import { CONFIG } from "../config.js";
import { getOpenAI, hasOpenAIKey } from "../openai-client.js";
import { recordTextSpend, wouldExceedCap } from "../cost.js";
import { listSources } from "./source-store.js";
import { relevantSources } from "./author-page.js";
import { getSkill } from "../skills/ai-200-outline.js";
import type { AuthoredPage, ClaimCheck, ClaimVerdict, GroundingResult, GroundingStatus } from "../types.js";

/**
 * GROUNDING GATE: verificador independiente del autor. Para cada afirmación con
 * cita a una fuente del corpus, un LLM escéptico (gpt-4o-mini, rol distinto al
 * autor gpt-4o) juzga si la fuente la respalda: supported / unsupported /
 * contradicted. Las afirmaciones sin fuente válida → no_source (no se pueden
 * verificar localmente). Calcula groundingStatus + score y BLOQUEA si algo está
 * sin respaldo o contradicho. 'verified' = todas citadas y respaldadas.
 */
export async function verifyGrounding(authored: AuthoredPage): Promise<GroundingResult> {
  const skillId = authored.skillId;
  const base = (extra: Partial<GroundingResult>): GroundingResult => ({
    outcome: "failed", model: null, skillId, groundingStatus: "unverified", score: 0,
    total: 0, supported: 0, unsupported: 0, contradicted: 0, noSource: 0, blocked: true,
    reason: "", checks: [], error: null, ...extra,
  });

  const d = authored.draft;
  if (!d) return base({ outcome: "no_claims", blocked: false, groundingStatus: "unverified", reason: "Sin borrador para verificar." });

  // (b) COBERTURA COMPLETA: no verificamos solo los claims que el autor declaró,
  // sino TODO lo que la página AFIRMA — la corrección de cada trampa y la
  // explicación del autocheck — contra el corpus. Así "verified" significa que la
  // página entera es trazable, no solo su lista de claims (cierra el agujero).
  const seen = new Set<string>();
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  const list: { id: string; field: string; text: string; kind: ClaimCheck["citationKind"] }[] = [];
  const push = (id: string, field: string, text: string, kind: ClaimCheck["citationKind"]) => {
    const t = String(text ?? "").trim();
    if (t.length < 8) return;
    const k = norm(t); if (seen.has(k)) return; seen.add(k);
    list.push({ id, field, text: t, kind });
  };
  authored.claims.forEach((c, i) => push(c.id || `c${i + 1}`, c.field, c.text, c.citation.kind));
  d.traps.forEach((t, i) => push(`trap${i + 1}`, "trampa", t.correction, "source"));
  push("autocheck-exp", "autocheck", d.autocheck.explanation, "source");
  // El CUERPO del Atlas (descripciones de los módulos) también pasa por el gate, así
  // cada zona tiene anclado real. Un módulo sin respaldo NO bloquea (ver tallyGrounding).
  d.visualModules.forEach((m, i) => push(`module${i + 1}`, "module", m.description, "source"));

  if (list.length === 0) return base({ outcome: "no_claims", blocked: false, groundingStatus: "unverified", reason: "Sin afirmaciones verificables." });
  if (!hasOpenAIKey()) return base({ outcome: "no_key", error: "Sin llave OpenAI." });

  // SIMETRÍA CON EL AUTOR: verificar contra las MISMAS fuentes que el autor usó (authored.sourceIds),
  // con la unidad PROPIA completa. Antes leía las primeras 10 GLOBALES truncadas a 2600 → marcaba
  // 'unsupported' claims respaldados por texto que el verificador no veía (falso bloqueo, atlas AB-620).
  const ownUrl = (getSkill(skillId)?.url ?? "").split("?")[0];
  const usedIds = new Set(authored.sourceIds);
  const scoped = listSources().filter((s) => usedIds.has(s.id));
  const sources = scoped.length > 0 ? scoped : relevantSources(skillId, listSources());
  const checks: ClaimCheck[] = list.map((a) => ({
    claimId: a.id, field: a.field, text: a.text, citationKind: a.kind, sourceId: null,
    verdict: "no_source" as ClaimVerdict, note: "",
  }));

  if (sources.length > 0) {
    const openai = getOpenAI();
    if (!openai) return base({ outcome: "no_key", error: "Cliente OpenAI no disponible." });
    if (wouldExceedCap(0.01)) return base({ outcome: "failed", model: CONFIG.qaModel, error: "Tope mensual de costo alcanzado." });

    const corpus = sources.slice(0, 10).map((s) => {
      const isOwn = !!ownUrl && (s.url ?? "").split("?")[0] === ownUrl;
      return `[${s.id}] ${s.title}\n${(s.text ?? "").slice(0, isOwn ? 16000 : 4000)}`;
    }).join("\n---\n");
    const claimsBlock = list.map((a, i) => `${i + 1}. (id ${a.id}) [${a.field}] "${a.text}"`).join("\n");
    const sys =
      "Sos un verificador de hechos independiente y escéptico para una editorial de certificación cloud. " +
      "NO redactás ni mejorás contenido: para CADA afirmación juzgás SOLO contra las FUENTES del corpus. " +
      "Reglas: 'supported' si alguna fuente la respalda explícita o claramente; 'unsupported' si ninguna fuente la menciona; " +
      "'contradicted' si alguna fuente dice lo contrario. Ante la duda, NO es 'supported'. Respondés SOLO JSON.";
    const user =
`Verificá CADA afirmación de una página de estudio contra el corpus de fuentes.

FUENTES:
${corpus}

AFIRMACIONES:
${claimsBlock}

Devolvé EXACTAMENTE: {"verdicts":[{"id":"...","verdict":"supported|unsupported|contradicted","note":"1 frase breve"}]}`;

    try {
      const res = await openai.chat.completions.create({
        model: CONFIG.qaModel,
        messages: [{ role: "system", content: sys }, { role: "user", content: user }],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 1200,
      });
      recordTextSpend(CONFIG.qaModel, res.usage, { kind: "text", pageId: skillId, label: "verify-grounding" });
      const raw = JSON.parse(res.choices[0]?.message?.content ?? "{}") as { verdicts?: { id?: string; verdict?: string; note?: string }[] };
      const byId = new Map((raw.verdicts ?? []).map((v) => [String(v.id), v] as const));
      // ── ANTI FAIL-CLOSED (P0) ────────────────────────────────────────────────────────
      // El Map se llavea con los ids que DEVUELVE el modelo. Si vuelve vacío, con menos veredictos o
      // renombrando ids, toda claim sin match caía a "unsupported" → tallyGrounding bloqueaba la página,
      // INDISTINGUIBLE de contenido realmente infundado. Un fallo del verificador NO es un veredicto:
      // con cobertura insuficiente se reporta como fallo explícito y no se emite juicio de fidelidad.
      const covered = checks.filter((c) => byId.has(c.claimId)).length;
      if (checks.length > 0 && covered < Math.ceil(checks.length * 0.9)) {
        return base({ outcome: "failed", model: CONFIG.qaModel, error: `verificador devolvió ${covered}/${checks.length} veredictos (cobertura insuficiente): no se emite juicio de fidelidad` });
      }
      for (const c of checks) {
        const v = byId.get(c.claimId);
        c.verdict = v?.verdict === "supported" ? "supported" : v?.verdict === "contradicted" ? "contradicted" : "unsupported";
        c.note = String(v?.note ?? "");
      }
    } catch (err) {
      return base({ outcome: "failed", model: CONFIG.qaModel, error: String((err as Error)?.message ?? err) });
    }
  }

  const t = tallyGrounding(checks);
  return { outcome: "real", model: CONFIG.qaModel, skillId, checks, error: null, ...t };
}

/**
 * Lógica PURA del gate: cuenta veredictos → estado + score + bloqueo.
 * 'verified' = todas citadas y respaldadas; bloquea si hay contradicha/sin respaldo.
 */
export function tallyGrounding(checks: ClaimCheck[]): {
  groundingStatus: GroundingStatus; score: number; total: number;
  supported: number; unsupported: number; contradicted: number; noSource: number;
  blocked: boolean; reason: string;
} {
  const total = checks.length;
  const supported = checks.filter((c) => c.verdict === "supported").length;
  const unsupported = checks.filter((c) => c.verdict === "unsupported").length;
  const contradicted = checks.filter((c) => c.verdict === "contradicted").length;
  const noSource = checks.filter((c) => c.verdict === "no_source").length;

  // BLOQUEO SOFT PARA MÓDULOS: una afirmación "dura" (context/trampa/autocheck/claim del
  // autor) sin respaldo bloquea; un MÓDULO sin respaldo NO bloquea (baja verified→partial,
  // pero la página igual se persiste — el cuerpo se chequea por transparencia, no para vetar).
  const hardUnsupported = checks.filter((c) => c.verdict === "unsupported" && c.field !== "module").length;
  const softUnsupported = unsupported - hardUnsupported;
  const blocked = contradicted > 0 || hardUnsupported > 0;
  const groundingStatus: GroundingStatus = blocked
    ? "unverified"
    : noSource === 0 && supported === total
      ? "verified"
      : "partial";
  const score = total ? Math.round(((supported + 0.5 * noSource) / total) * 100) / 10 : 0;

  const reason = blocked
    ? `Bloqueada: ${contradicted} contradicha(s) y ${hardUnsupported} sin respaldo en su fuente.`
    : groundingStatus === "verified"
      ? "Verificada: todas las afirmaciones citan una fuente que las respalda."
      : `Parcial: ${supported}/${total} respaldadas; ${noSource} sin fuente (modelo)${softUnsupported ? `; ${softUnsupported} módulo(s) sin respaldo en la fuente` : ""}.`;

  return { groundingStatus, score, total, supported, unsupported, contradicted, noSource, blocked, reason };
}

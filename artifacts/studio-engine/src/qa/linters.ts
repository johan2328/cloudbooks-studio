/**
 * BIBLIOTECA DE LINTERS DETERMINISTAS del QA. Reglas fijas (regex/recuperación) que dan SIEMPRE el mismo
 * veredicto para el mismo texto → cero ruido, cero costo LLM. Cubren lo OBJETIVO (seguridad, CLI, grounding),
 * dejando al panel LLM solo lo subjetivo (pedagogía, engagement, visual). Cada regla que se agrega acá caza
 * el defecto el 100% de las veces y para siempre. Compartido por el panel de ruta y (a futuro) el gate de gen.
 */
import { certDomain, type LintRule } from "../cert-domain.js";

export interface LintFinding { severity: "blocker" | "major" | "minor"; issue: string; where: string; fix: string }

const clamp = (n: number): number => Math.max(0, Math.min(10, Math.round(n * 10) / 10));
const cut = (s: string, n = 110): string => (s.length > n ? `${s.slice(0, n)}…` : s);

// ── 1) SEGURIDAD + 2) CLI: reglas deterministas POR DOMINIO (cert activo) ──
// Movidas a `cert-domain.ts` (AI-200 = SSH oficial App Service/Docker! centinela + CLI az; agnóstico = solo secreto
// en claro genérico). Barrido cross-cert Fase 2. `fixContent` ya arregla la mayoría de los CLI; esto es la red.
function scan(text: string, rules: LintRule[]): LintFinding[] {
  const t = String(text ?? "");
  const out: LintFinding[] = [];
  for (const r of rules) {
    const m = r.re.exec(t);
    if (m) out.push({ severity: r.severity, issue: r.issue, where: `“${cut(m[0], 60)}”`, fix: r.fix });
  }
  return out;
}

export function securityLint(text: string): LintFinding[] { return scan(text, certDomain().securityLintRules); }
export function cliLint(text: string): LintFinding[] { return scan(text, certDomain().cliLintRules); }

/** Score de un linter a partir de sus findings (10 = limpio; penaliza blocker/major/minor). */
export function lintScore(findings: LintFinding[]): number {
  const blocker = findings.filter((f) => f.severity === "blocker").length;
  const major = findings.filter((f) => f.severity === "major").length;
  const minor = findings.filter((f) => f.severity === "minor").length;
  return clamp(10 - blocker * 5 - major * 2 - minor * 0.5);
}

// ── 3) GROUNDING por recuperación: ¿los términos TÉCNICOS de cada afirmación están en el corpus? ──
// Invariante al idioma (flags, UPPER_SNAKE, digests, identificadores con dígito/guión/_/./{{}}): caza valores
// alucinados que no aparecen en el corpus. Mismo input → mismo veredicto.
function distinctiveTokens(text: string): string[] {
  const out = new Set<string>();
  for (const w0 of String(text ?? "").split(/[\s,;:()"'`]+/)) {
    const w = w0.replace(/[.,;:]+$/, "").trim();
    if (w.length < 3) continue;
    const technical = /^--[a-z]/.test(w) || /[_/]/.test(w) || /\d/.test(w) || /[a-z]-[a-z0-9]/i.test(w) || /^[A-Z][A-Z0-9]{2,}$/.test(w) || /\{\{.*\}\}/.test(w);
    if (technical) out.add(w.toLowerCase());
  }
  return [...out];
}

export interface GroundingResult { score: number | null; findings: LintFinding[]; veredicto: string }
/** `claimText` recibe cada afirmación ya renderizada (texto que ve el lector). */
export function groundingCheck(claims: { ch: string; text: string }[], corpus: string): GroundingResult {
  if (!claims.length) return { score: null, findings: [], veredicto: "Sin afirmaciones registradas para auditar por recuperación." };
  const corpusLc = corpus.toLowerCase();
  const findings: LintFinding[] = [];
  let grounded = 0;
  for (const cl of claims) {
    const toks = distinctiveTokens(cl.text);
    if (toks.length < 2) { grounded++; continue; }
    const missing = toks.filter((t) => !corpusLc.includes(t));
    if (missing.length >= 2 && missing.length / toks.length > 0.6) {
      findings.push({ severity: "major", issue: `Términos técnicos ausentes del corpus en: "${cut(cl.text)}"`, where: `cap ${cl.ch}`, fix: `Verificar o citar; faltan: ${missing.slice(0, 6).join(", ")}` });
    } else {
      grounded++;
    }
  }
  return {
    score: clamp((grounded / claims.length) * 10),
    findings: findings.slice(0, 12),
    veredicto: `Recuperación determinista: ${grounded}/${claims.length} afirmaciones con respaldo textual en el corpus; ${findings.length} con términos técnicos ausentes. Sin ruido de juez.`,
  };
}

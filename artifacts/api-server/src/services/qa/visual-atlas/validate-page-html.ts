import type { VisualAtlasPageData } from "../../../lib/visual-atlas-types";
import { VISUAL_ATLAS_V24_CONTRACT } from "../../../domain/editorial-contracts/visual-atlas-v24";

export interface StructuralQaResult {
  passed: boolean;
  checks: { name: string; ok: boolean; detail?: string }[];
  score: number;
}

export interface QaDimensionScores {
  artDirection:         number;
  editorialConsistency: number;
  readability:          number;
  technicalAccuracy:    number;
  density:              number;
  commercialRisk:       number;
  avg:                  number;
  verdict:              "needs_visual_review" | "needs_revision";
  verdictLabel:         string;
}

/**
 * Deterministic structural QA against the centralized Visual Atlas v24 contract.
 * Human visual QA still decides whether the generated upper visual reaches 9.5.
 */
export function runStructuralQa(html: string, data: VisualAtlasPageData): StructuralQaResult {
  const contract = VISUAL_ATLAS_V24_CONTRACT;
  const checks = [
    {
      name: `Dimensions ${contract.page.width}x${contract.page.height}`,
      ok: html.includes(`width: ${contract.page.width}px`) && html.includes(`height: ${contract.page.height}px`),
    },
    { name: `Grid rows ${contract.page.gridRows}`, ok: html.includes(contract.page.gridRows) },
    { name: `Body rows ${contract.page.bodyRows}`, ok: html.includes(contract.page.bodyRows) },
    { name: `Editorial background ${contract.page.background}`, ok: html.includes(`background: ${contract.page.background}`) },
    { name: `Topbar/footer ${contract.chrome.topbar.background}`, ok: html.includes(contract.chrome.topbar.background) },
    { name: `Topbar font ${contract.chrome.topbar.fontSize}px`, ok: html.includes(`font-size: ${contract.chrome.topbar.fontSize}px`) },
    { name: "Topbar without certification badge", ok: !html.includes('class="tb-badge"') },
    { name: "Title present in h1", ok: html.includes(data.title) },
    { name: "Context deck present", ok: html.includes(data.context.slice(0, 40)) },
    { name: "Guide question present", ok: html.includes(data.guideQuestion.slice(0, 30)) },
    { name: "Guide icon present", ok: html.includes('class="guide-mark"') && html.includes('aria-hidden="true"') },
    { name: "Domain title icon present", ok: html.includes('class="title-icon"') },
    { name: "Upper visual block exists", ok: html.includes('class="upper"') },
    { name: "Exam traps: 3 items", ok: data.traps.length === 3 },
    { name: `Exam traps header ${contract.page.trapColor}`, ok: html.includes(contract.page.trapColor) },
    { name: `Guide border ${contract.page.guideColor}`, ok: html.includes(contract.page.guideColor) },
    { name: "Footer brand present", ok: html.includes(contract.chrome.footer.brandText) },
    { name: `Footer font ${contract.chrome.footer.fontSize}px`, ok: html.includes(`font-size: ${contract.chrome.footer.fontSize}px`) },
    { name: "No external CDNs", ok: !html.includes("googleapis.com") && !html.includes("cloudflare.com") },
    { name: "No dark app body background", ok: !html.includes("background: #0d1629") },
  ];
  const passed = checks.filter((c) => c.ok).length;
  const total = checks.length;
  return { passed: passed === total, checks, score: Math.round((passed / total) * 10) };
}

/**
 * Deterministic QA dimensions. These are conservative until human visual QA
 * confirms the upper visual against the art direction threshold.
 */
export function computeQaDimensionScores(imageGenerated: boolean): QaDimensionScores {
  const contract = VISUAL_ATLAS_V24_CONTRACT;
  const artDirection = imageGenerated ? 7 : 5;
  const editorialConsistency = imageGenerated ? 7 : 5;
  const readability = 8;
  const technicalAccuracy = 10;
  const density = imageGenerated ? 7 : 4;
  const commercialRisk = 10;
  const avg = Math.round(
    (artDirection + editorialConsistency + readability + technicalAccuracy + density + commercialRisk) / 6,
  );
  const verdict = imageGenerated ? "needs_visual_review" as const : "needs_revision" as const;
  const verdictLabel = imageGenerated
    ? `Requires human visual review: target ${contract.qa.humanArtScoreToProduce}/10 before production`
    : "Blocked: upper visual is not a real premium image";
  return {
    artDirection,
    editorialConsistency,
    readability,
    technicalAccuracy,
    density,
    commercialRisk,
    avg,
    verdict,
    verdictLabel,
  };
}

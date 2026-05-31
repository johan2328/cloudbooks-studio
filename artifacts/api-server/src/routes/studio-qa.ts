import { Router } from "express";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { join } from "path";

import { pageOutputDir } from "../services/export/paths";

const router = Router();

function normalizeScoreToTen(raw: number): number {
  if (!Number.isFinite(raw)) return 0;
  let value = raw;
  while (value > 10) value /= 10;
  if (value < 0) value = 0;
  if (value > 10) value = 10;
  return Math.round(value * 10) / 10;
}

function extractScore(raw: string, pattern: RegExp): number | null {
  const match = raw.match(pattern);
  if (!match) return null;
  const parsed = parseFloat(match[1]);
  if (!Number.isFinite(parsed)) return null;
  return normalizeScoreToTen(parsed);
}

/**
 * GET /api/studio/qa-report/:pageId
 * Parse qa-report.md and return structured scores + observations + raw text.
 */
router.get("/studio/qa-report/:pageId", async (req, res): Promise<void> => {
  const { pageId } = req.params;
  const qaPath = join(pageOutputDir(pageId), "qa-report.md");

  if (!existsSync(qaPath)) {
    res.status(404).json({ error: "qa-report.md not found" });
    return;
  }

  try {
    const raw = await readFile(qaPath, "utf-8");

    const scorePatterns: Record<string, RegExp> = {
      art_direction: /^-\s+Direcci[oó]n de arte:\s+\*\*(\d+(?:\.\d+)?)\/10\*\*/im,
      editorial_consistency: /^-\s+Consistencia editorial:\s+\*\*(\d+(?:\.\d+)?)\/10\*\*/im,
      readability: /^-\s+Legibilidad:\s+\*\*(\d+(?:\.\d+)?)\/10\*\*/im,
      technical_accuracy: /^-\s+Precisi[oó]n t[eé]cnica:\s+\*\*(\d+(?:\.\d+)?)\/10\*\*/im,
      useful_density: /^-\s+Densidad [uú]til:\s+\*\*(\d+(?:\.\d+)?)\/10\*\*/im,
      commercial_risk: /^-\s+Seguridad comercial:\s+\*\*(\d+(?:\.\d+)?)\/10\*\*/im,
      total: /^##\s+Scores\s+\((\d+(?:\.\d+)?)\/10/im,
    };

    const scores: Record<string, number> = {};
    for (const [key, pattern] of Object.entries(scorePatterns)) {
      const value = extractScore(raw, pattern);
      if (value === null) continue;
      scores[key] = value;
    }

    const isApproved = /APROBADO|approved/i.test(raw);
    const verdict = isApproved ? "approved" : "needs_revision";
    const observations = raw
      .split("\n")
      .filter((line) => /^[\-·•]\s+.{10,}/.test(line.trim()))
      .map((line) => line.replace(/^[\-·•]\s+/, "").trim())
      .slice(0, 8);
    const redTeamLog = raw
      .split("\n")
      .filter((line) => /[✓✗⚠]/.test(line))
      .map((line) => line.trim())
      .slice(0, 10);

    res.json({ verdict, scores, observations, redTeamLog, raw });
  } catch (err) {
    req.log.error({ err }, "Error parsing qa-report.md");
    res.status(500).json({ error: "Failed to parse QA report" });
  }
});

export default router;

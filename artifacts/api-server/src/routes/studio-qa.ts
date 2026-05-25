import { Router } from "express";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

import { pageOutputDir } from "../services/export/paths";

const router = Router();

/**
 * GET /api/studio/qa-report/:pageId
 * Parsea qa-report.md y retorna scores estructurados + texto raw.
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

    const scores: Record<string, number> = {};
    interface DimMap { key: string; patterns: RegExp[] }
    const DIM_MAPS: DimMap[] = [
      { key: "art_direction",         patterns: [/direcci[oó]n de arte[^*\d]*\**(\d+(?:\.\d+)?)/i] },
      { key: "editorial_consistency", patterns: [/consistencia editorial[^*\d]*\**(\d+(?:\.\d+)?)/i] },
      { key: "readability",           patterns: [/legibilidad[^*\d]*\**(\d+(?:\.\d+)?)/i] },
      { key: "technical_accuracy",    patterns: [/precisi[oó]n t[eé]cnica[^*\d]*\**(\d+(?:\.\d+)?)/i] },
      { key: "useful_density",        patterns: [/densidad [uú]til[^*\d]*\**(\d+(?:\.\d+)?)/i] },
      { key: "commercial_risk",       patterns: [/riesgo comercial[^*\d]*\**(\d+(?:\.\d+)?)/i] },
      { key: "total",                 patterns: [/scores\s*\((\d+(?:\.\d+)?)\/10/i] },
    ];
    for (const { key, patterns } of DIM_MAPS) {
      for (const pat of patterns) {
        const m = raw.match(pat);
        if (m) { scores[key] = parseFloat(m[1]); break; }
      }
    }

    const isApproved   = /APROBADO|approved/i.test(raw);
    const verdict      = isApproved ? "approved" : "needs_revision";
    const observations = raw
      .split("\n")
      .filter(l => /^[\-·•]\s+.{10,}/.test(l.trim()))
      .map(l => l.replace(/^[\-·•]\s+/, "").trim())
      .slice(0, 8);
    const redTeamLog = raw
      .split("\n")
      .filter(l => /[✓✗⚠]/.test(l))
      .map(l => l.trim())
      .slice(0, 10);

    res.json({ verdict, scores, observations, redTeamLog, raw });
  } catch (err) {
    req.log.error({ err }, "Error parsing qa-report.md");
    res.status(500).json({ error: "Failed to parse QA report" });
  }
});

export default router;

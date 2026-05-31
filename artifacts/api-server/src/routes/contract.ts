import { Router, type IRouter } from "express";
import { db, visualContractsTable } from "@workspace/db";
import { GetContractResponse, UpdateContractBody, UpdateContractResponse } from "@workspace/api-zod";
import { desc, eq } from "drizzle-orm";
import { serializeDates } from "../lib/serialize.js";
import { getAuthUserFromHeader, insertEditorialEvent } from "../services/studio/editorial-events";

const router: IRouter = Router();

const DEFAULT_CONTRACT = {
  version: "v24",
  nonNegotiable: [
    "Topbar, hero, pregunta guia, traps/autocheck y footer son ownership HTML.",
    "Upper visual solo aporta cuerpo tecnico modular 2x2; no reescribe chrome.",
    "Canvas final fijo 768x1152 con jerarquia tipografica estable.",
    "Sin placeholder visual en aprobacion editorial; requiere upper real.",
  ],
  flexibleStorytelling: [
    "El cuerpo tecnico puede variar entre diagrama, comparativa, decision tree y mapa.",
    "Se permite ajustar densidad por modulo sin romper consistencia editorial.",
    "Composer puede compactar rail inferior y expandir contexto para cerrar huecos.",
  ],
  stableComponents: [
    "Paleta editorial navy + azure + teal, fondo claro y separadores sutiles.",
    "Sistema de numeracion modular uniforme entre tarjetas.",
    "QA por dimensiones con trazabilidad de revisiones en changelog.",
  ],
  changelog: [
    {
      version: "v24",
      note: "Bootstrap inicial del contrato visual persistente.",
      at: new Date().toISOString(),
    },
  ],
};

async function ensureContractExists() {
  const [existing] = await db
    .select()
    .from(visualContractsTable)
    .orderBy(desc(visualContractsTable.updatedAt), desc(visualContractsTable.id))
    .limit(1);
  if (existing) {
    const normalizedNonNegotiable = normalizeStringArray(existing.nonNegotiable, DEFAULT_CONTRACT.nonNegotiable);
    const normalizedFlexibleStorytelling = normalizeStringArray(existing.flexibleStorytelling, DEFAULT_CONTRACT.flexibleStorytelling);
    const normalizedStableComponents = normalizeStringArray(existing.stableComponents, DEFAULT_CONTRACT.stableComponents);
    const normalizedChangelog = normalizeChangelog(existing.changelog, existing.version || DEFAULT_CONTRACT.version);
    const normalizedVersion = normalizeVersion(existing.version);

    const changed =
      normalizedVersion !== existing.version
      || JSON.stringify(normalizedNonNegotiable) !== JSON.stringify(existing.nonNegotiable)
      || JSON.stringify(normalizedFlexibleStorytelling) !== JSON.stringify(existing.flexibleStorytelling)
      || JSON.stringify(normalizedStableComponents) !== JSON.stringify(existing.stableComponents)
      || JSON.stringify(normalizedChangelog) !== JSON.stringify(existing.changelog);

    if (!changed) return existing;

    const [healed] = await db
      .update(visualContractsTable)
      .set({
        version: normalizedVersion,
        nonNegotiable: normalizedNonNegotiable,
        flexibleStorytelling: normalizedFlexibleStorytelling,
        stableComponents: normalizedStableComponents,
        changelog: normalizedChangelog,
        updatedAt: new Date(),
      })
      .where(eq(visualContractsTable.id, existing.id))
      .returning();
    return healed;
  }

  const [created] = await db
    .insert(visualContractsTable)
    .values({
      version: DEFAULT_CONTRACT.version,
      nonNegotiable: DEFAULT_CONTRACT.nonNegotiable,
      flexibleStorytelling: DEFAULT_CONTRACT.flexibleStorytelling,
      stableComponents: DEFAULT_CONTRACT.stableComponents,
      changelog: DEFAULT_CONTRACT.changelog,
      updatedAt: new Date(),
    })
    .returning();
  return created;
}

function normalizeVersion(value: unknown): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : DEFAULT_CONTRACT.version;
}

function normalizeStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return [...fallback];
  const unique = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") continue;
    const normalized = item.trim();
    if (!normalized) continue;
    unique.add(normalized);
  }
  const output = Array.from(unique);
  return output.length > 0 ? output : [...fallback];
}

function normalizeChangelog(value: unknown, fallbackVersion: string): Array<{ version: string; note: string; at: string }> {
  if (!Array.isArray(value)) {
    return [{
      version: fallbackVersion,
      note: "Bootstrap inicial del contrato visual persistente.",
      at: new Date().toISOString(),
    }];
  }

  const rows = value
    .map((item) => (typeof item === "object" && item ? item as Record<string, unknown> : null))
    .filter((item): item is Record<string, unknown> => Boolean(item))
    .map((item) => {
      const version = typeof item.version === "string" && item.version.trim().length > 0
        ? item.version.trim()
        : fallbackVersion;
      const note = typeof item.note === "string" && item.note.trim().length > 0
        ? item.note.trim()
        : "Sin detalle editorial";
      const at = typeof item.at === "string" && item.at.trim().length > 0
        ? item.at.trim()
        : new Date().toISOString();
      return { version, note, at };
    });

  if (rows.length > 0) return rows;
  return [{
    version: fallbackVersion,
    note: "Bootstrap inicial del contrato visual persistente.",
    at: new Date().toISOString(),
  }];
}

router.get("/contract", async (_req, res): Promise<void> => {
  try {
    const contract = await ensureContractExists();
    res.json(GetContractResponse.parse(serializeDates(contract)));
  } catch (error) {
    res.status(500).json({ error: "No se pudo inicializar el contrato visual", detail: String(error) });
  }
});

router.put("/contract", async (req, res): Promise<void> => {
  const parsed = UpdateContractBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await ensureContractExists();
  const user = await getAuthUserFromHeader(req.header("authorization"));
  const nextVersion = normalizeVersion(parsed.data.version ?? existing.version);
  const nextNonNegotiable = parsed.data.nonNegotiable
    ? normalizeStringArray(parsed.data.nonNegotiable, DEFAULT_CONTRACT.nonNegotiable)
    : normalizeStringArray(existing.nonNegotiable, DEFAULT_CONTRACT.nonNegotiable);
  const nextFlexibleStorytelling = parsed.data.flexibleStorytelling
    ? normalizeStringArray(parsed.data.flexibleStorytelling, DEFAULT_CONTRACT.flexibleStorytelling)
    : normalizeStringArray(existing.flexibleStorytelling, DEFAULT_CONTRACT.flexibleStorytelling);
  const nextStableComponents = parsed.data.stableComponents
    ? normalizeStringArray(parsed.data.stableComponents, DEFAULT_CONTRACT.stableComponents)
    : normalizeStringArray(existing.stableComponents, DEFAULT_CONTRACT.stableComponents);
  const existingChangelog = normalizeChangelog(existing.changelog, existing.version);

  const newChangelog = parsed.data.changeNote
    ? [
      ...existingChangelog,
        {
          version: nextVersion,
          note: `${parsed.data.changeNote} · por ${user.displayName}`,
          at: new Date().toISOString(),
        },
      ]
    : existingChangelog;

  const [updated] = await db
    .update(visualContractsTable)
    .set({
      version: nextVersion,
      nonNegotiable: nextNonNegotiable,
      flexibleStorytelling: nextFlexibleStorytelling,
      stableComponents: nextStableComponents,
      changelog: newChangelog,
      updatedAt: new Date(),
    })
    .where(eq(visualContractsTable.id, existing.id))
    .returning();

  await insertEditorialEvent({
    actionType: "contract_updated",
    pageId: null,
    pageNumber: null,
    pageTitle: "Visual Atlas Contract",
    userId: user.id,
    userName: user.displayName,
    result: `Contrato ${updated.version} guardado en BD`,
    note: parsed.data.changeNote?.trim() || "Actualizacion sin nota explícita",
  });

  res.json(UpdateContractResponse.parse(serializeDates(updated)));
});

export default router;

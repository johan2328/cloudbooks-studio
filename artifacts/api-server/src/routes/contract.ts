import { Router, type IRouter } from "express";
import { db, visualContractsTable } from "@workspace/db";
import { GetContractResponse, UpdateContractBody, UpdateContractResponse } from "@workspace/api-zod";
import { serializeDates } from "../lib/serialize.js";

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
  const [existing] = await db.select().from(visualContractsTable).orderBy(visualContractsTable.id).limit(1);
  if (existing) return existing;
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

  const newChangelog = parsed.data.changeNote
    ? [
      ...(existing.changelog as Array<{ version: string; note: string; at: string }>),
        {
          version: parsed.data.version ?? existing.version,
          note: parsed.data.changeNote,
          at: new Date().toISOString(),
        },
      ]
    : existing.changelog;

  const [updated] = await db
    .update(visualContractsTable)
    .set({
      version: parsed.data.version ?? existing.version,
      nonNegotiable: parsed.data.nonNegotiable ?? existing.nonNegotiable,
      flexibleStorytelling: parsed.data.flexibleStorytelling ?? existing.flexibleStorytelling,
      stableComponents: parsed.data.stableComponents ?? existing.stableComponents,
      changelog: newChangelog,
      updatedAt: new Date(),
    })
    .returning();

  res.json(UpdateContractResponse.parse(serializeDates(updated)));
});

export default router;

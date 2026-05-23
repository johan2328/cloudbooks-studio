import { Router, type IRouter } from "express";
import { db, visualContractsTable } from "@workspace/db";
import { GetContractResponse, UpdateContractBody, UpdateContractResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/contract", async (_req, res): Promise<void> => {
  const [contract] = await db.select().from(visualContractsTable).limit(1);

  if (!contract) {
    res.status(404).json({ error: "Contrato visual no encontrado" });
    return;
  }

  res.json(GetContractResponse.parse(contract));
});

router.put("/contract", async (req, res): Promise<void> => {
  const parsed = UpdateContractBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(visualContractsTable).limit(1);
  if (!existing) {
    res.status(404).json({ error: "Contrato visual no encontrado" });
    return;
  }

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
    })
    .returning();

  res.json(UpdateContractResponse.parse(updated));
});

export default router;

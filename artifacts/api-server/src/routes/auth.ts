import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { LoginBody, LoginResponse, GetMeResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, pin } = parsed.data;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username));

  if (!user || user.pinHash !== pin) {
    res.status(401).json({ error: "Credenciales incorrectas" });
    return;
  }

  // Store in session cookie (simple approach — no JWT needed for 4-person internal tool)
  (req as any).session = { userId: user.id };

  const result = LoginResponse.parse({
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
    },
    token: `demo-token-${user.id}`,
  });

  res.json(result);
});

router.get("/auth/me", async (req, res): Promise<void> => {
  // Simple session from Authorization header for demo
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer demo-token-")) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }

  const userId = parseInt(authHeader.replace("Bearer demo-token-", ""), 10);
  if (isNaN(userId)) {
    res.status(401).json({ error: "Token inválido" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(401).json({ error: "Usuario no encontrado" });
    return;
  }

  res.json(
    GetMeResponse.parse({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
    })
  );
});

router.post("/auth/logout", async (_req, res): Promise<void> => {
  res.json({ ok: true });
});

export default router;

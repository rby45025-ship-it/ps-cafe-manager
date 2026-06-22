import { Router } from "express";
import { db, appSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpdateSettingsBody } from "@workspace/api-zod";

const router = Router();

router.get("/settings", async (req, res) => {
  try {
    const settings = await db.select().from(appSettingsTable).limit(1);

    if (!settings[0]) {
      const inserted = await db
        .insert(appSettingsTable)
        .values({ startWithWindows: false })
        .returning();
      return res.json(inserted[0]);
    }

    res.json(settings[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to get settings" });
  }
});

router.patch("/settings", async (req, res) => {
  try {
    const body = UpdateSettingsBody.parse(req.body);

    const existing = await db.select().from(appSettingsTable).limit(1);

    let result;
    if (!existing[0]) {
      const inserted = await db
        .insert(appSettingsTable)
        .values({
          startWithWindows: body.startWithWindows ?? false,
        })
        .returning();
      result = inserted[0];
    } else {
      const updated = await db
        .update(appSettingsTable)
        .set({
          ...(body.startWithWindows !== undefined && {
            startWithWindows: body.startWithWindows,
          }),
        })
        .where(eq(appSettingsTable.id, existing[0].id))
        .returning();
      result = updated[0];
    }

    res.json(result);
  } catch (err) {
    res.status(400).json({ error: "Invalid request" });
  }
});

export default router;

import { Router } from "express";
import { db, devicesTable, sessionsTable, alarmStateTable } from "@workspace/db";
import { eq, isNull } from "drizzle-orm";
import { UpdateDeviceBody, UpdateDeviceParams } from "@workspace/api-zod";

const router = Router();

router.get("/devices", async (req, res) => {
  try {
    const devices = await db.select().from(devicesTable);

    const result = await Promise.all(
      devices.map(async (device) => {
        const activeSessions = await db
          .select()
          .from(sessionsTable)
          .where(eq(sessionsTable.deviceId, device.id))
          .orderBy(sessionsTable.id);

        const activeSession = activeSessions.find(
          (s) => s.status === "active" || s.status === "expired"
        );

        const alarm = await db
          .select()
          .from(alarmStateTable)
          .where(eq(alarmStateTable.deviceId, device.id))
          .limit(1);

        const alarmActive = alarm[0]?.active ?? false;

        let status: "available" | "in_use" | "expired" = "available";
        let sessionPayload = null;

        if (activeSession) {
          const now = Date.now();
          const start = new Date(activeSession.startTime).getTime();
          const durationMs = activeSession.durationMinutes * 60 * 1000;
          const elapsed = now - start;
          const remainingMs = durationMs - elapsed;
          const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));

          if (activeSession.status === "expired" || remainingSeconds === 0) {
            status = "expired";
          } else {
            status = "in_use";
          }

          sessionPayload = {
            id: activeSession.id,
            deviceId: activeSession.deviceId,
            startTime: activeSession.startTime.toISOString(),
            endTime: activeSession.endTime?.toISOString() ?? null,
            durationMinutes: activeSession.durationMinutes,
            remainingSeconds,
            cost: activeSession.cost,
            status: status === "expired" ? "expired" : "active",
          };
        }

        return {
          id: device.id,
          name: device.name,
          hourlyRate: device.hourlyRate,
          status,
          activeSession: sessionPayload,
          alarmActive,
        };
      })
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to get devices" });
  }
});

router.post("/devices", async (req, res) => {
  try {
    const { name, hourlyRate } = req.body;
    if (!name || hourlyRate === undefined) {
      return res.status(400).json({ error: "name and hourlyRate are required" });
    }
    const [device] = await db
      .insert(devicesTable)
      .values({ name: String(name), hourlyRate: parseFloat(hourlyRate) })
      .returning();
    res.status(201).json({ id: device.id, name: device.name, hourlyRate: device.hourlyRate, status: "available", activeSession: null, alarmActive: false });
  } catch (err) {
    res.status(500).json({ error: "Failed to create device" });
  }
});

router.delete("/devices/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(sessionsTable).where(eq(sessionsTable.deviceId, id));
    await db.delete(alarmStateTable).where(eq(alarmStateTable.deviceId, id));
    const deleted = await db.delete(devicesTable).where(eq(devicesTable.id, id)).returning();
    if (!deleted[0]) return res.status(404).json({ error: "Device not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete device" });
  }
});

router.patch("/devices/:id", async (req, res) => {
  try {
    const params = UpdateDeviceParams.parse(req.params);
    const body = UpdateDeviceBody.parse(req.body);

    const updated = await db
      .update(devicesTable)
      .set({
        ...(body.name !== undefined && { name: body.name }),
        ...(body.hourlyRate !== undefined && { hourlyRate: body.hourlyRate }),
      })
      .where(eq(devicesTable.id, params.id))
      .returning();

    if (!updated[0]) {
      return res.status(404).json({ error: "Device not found" });
    }

    res.json({
      id: updated[0].id,
      name: updated[0].name,
      hourlyRate: updated[0].hourlyRate,
      status: "available",
      activeSession: null,
      alarmActive: false,
    });
  } catch (err) {
    res.status(400).json({ error: "Invalid request" });
  }
});

export default router;

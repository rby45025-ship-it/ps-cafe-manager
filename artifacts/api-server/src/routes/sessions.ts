import { Router } from "express";
import { db, devicesTable, sessionsTable, alarmStateTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  StartSessionBody,
  EndSessionParams,
  AddTimeParams,
  AddTimeBody,
  SetAlarmParams,
  SetAlarmBody,
} from "@workspace/api-zod";

const router = Router();

router.post("/sessions", async (req, res) => {
  try {
    const body = StartSessionBody.parse(req.body);

    const device = await db
      .select()
      .from(devicesTable)
      .where(eq(devicesTable.id, body.deviceId))
      .limit(1);

    if (!device[0]) {
      return res.status(404).json({ error: "Device not found" });
    }

    const existingActive = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.deviceId, body.deviceId));

    const hasActive = existingActive.some(
      (s) => s.status === "active" || s.status === "expired"
    );
    if (hasActive) {
      return res.status(400).json({ error: "Device already has an active session" });
    }

    const newSession = await db
      .insert(sessionsTable)
      .values({
        deviceId: body.deviceId,
        durationMinutes: body.durationMinutes,
        status: "active",
        startTime: new Date(),
      })
      .returning();

    const session = newSession[0];
    const remainingSeconds = session.durationMinutes * 60;

    res.status(201).json({
      id: session.id,
      deviceId: session.deviceId,
      startTime: session.startTime.toISOString(),
      endTime: null,
      durationMinutes: session.durationMinutes,
      remainingSeconds,
      cost: null,
      status: "active",
    });
  } catch (err) {
    res.status(400).json({ error: "Invalid request" });
  }
});

router.post("/sessions/:id/end", async (req, res) => {
  try {
    const params = EndSessionParams.parse(req.params);

    const session = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.id, params.id))
      .limit(1);

    if (!session[0]) {
      return res.status(404).json({ error: "Session not found" });
    }

    const device = await db
      .select()
      .from(devicesTable)
      .where(eq(devicesTable.id, session[0].deviceId))
      .limit(1);

    const now = new Date();
    const start = new Date(session[0].startTime);
    const elapsedMs = now.getTime() - start.getTime();
    const elapsedMinutes = elapsedMs / (1000 * 60);
    const billedMinutes = Math.min(elapsedMinutes, session[0].durationMinutes);
    const cost = (billedMinutes / 60) * (device[0]?.hourlyRate ?? 0);

    const updated = await db
      .update(sessionsTable)
      .set({
        endTime: now,
        cost,
        status: "ended",
      })
      .where(eq(sessionsTable.id, params.id))
      .returning();

    await db
      .update(alarmStateTable)
      .set({ active: false })
      .where(eq(alarmStateTable.deviceId, session[0].deviceId));

    const s = updated[0];
    res.json({
      id: s.id,
      deviceId: s.deviceId,
      startTime: s.startTime.toISOString(),
      endTime: s.endTime?.toISOString() ?? null,
      durationMinutes: s.durationMinutes,
      remainingSeconds: 0,
      cost: s.cost,
      status: "ended",
    });
  } catch (err) {
    res.status(400).json({ error: "Invalid request" });
  }
});

router.post("/sessions/:id/addtime", async (req, res) => {
  try {
    const params = AddTimeParams.parse(req.params);
    const body = AddTimeBody.parse(req.body);

    const session = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.id, params.id))
      .limit(1);

    if (!session[0]) {
      return res.status(404).json({ error: "Session not found" });
    }

    const newDuration = session[0].durationMinutes + body.minutes;

    const updated = await db
      .update(sessionsTable)
      .set({
        durationMinutes: newDuration,
        status: "active",
      })
      .where(eq(sessionsTable.id, params.id))
      .returning();

    const s = updated[0];
    const now = Date.now();
    const start = new Date(s.startTime).getTime();
    const elapsed = now - start;
    const remainingMs = s.durationMinutes * 60 * 1000 - elapsed;
    const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));

    await db
      .update(alarmStateTable)
      .set({ active: false })
      .where(eq(alarmStateTable.deviceId, s.deviceId));

    res.json({
      id: s.id,
      deviceId: s.deviceId,
      startTime: s.startTime.toISOString(),
      endTime: null,
      durationMinutes: s.durationMinutes,
      remainingSeconds,
      cost: null,
      status: "active",
    });
  } catch (err) {
    res.status(400).json({ error: "Invalid request" });
  }
});

router.post("/alarm/:deviceId", async (req, res) => {
  try {
    const params = SetAlarmParams.parse(req.params);
    const body = SetAlarmBody.parse(req.body);

    const existing = await db
      .select()
      .from(alarmStateTable)
      .where(eq(alarmStateTable.deviceId, params.deviceId))
      .limit(1);

    if (existing[0]) {
      await db
        .update(alarmStateTable)
        .set({
          active: body.active,
          lastTriggeredAt: body.active ? new Date() : existing[0].lastTriggeredAt,
        })
        .where(eq(alarmStateTable.deviceId, params.deviceId));
    } else {
      await db.insert(alarmStateTable).values({
        deviceId: params.deviceId,
        active: body.active,
        lastTriggeredAt: body.active ? new Date() : null,
      });
    }

    if (body.active) {
      const session = await db
        .select()
        .from(sessionsTable)
        .where(eq(sessionsTable.deviceId, params.deviceId));

      const active = session.find((s) => s.status === "active" || s.status === "expired");
      if (active) {
        await db
          .update(sessionsTable)
          .set({ status: "expired" })
          .where(eq(sessionsTable.id, active.id));
      }
    }

    res.json({ deviceId: params.deviceId, active: body.active });
  } catch (err) {
    res.status(400).json({ error: "Invalid request" });
  }
});

router.get("/sessions/history", async (req, res) => {
  try {
    const sessions = await db
      .select({
        id: sessionsTable.id,
        deviceId: sessionsTable.deviceId,
        deviceName: devicesTable.name,
        startTime: sessionsTable.startTime,
        endTime: sessionsTable.endTime,
        durationMinutes: sessionsTable.durationMinutes,
        cost: sessionsTable.cost,
        status: sessionsTable.status,
      })
      .from(sessionsTable)
      .innerJoin(devicesTable, eq(sessionsTable.deviceId, devicesTable.id))
      .orderBy(sessionsTable.id);

    const result = sessions.map((s) => ({
      id: s.id,
      deviceId: s.deviceId,
      deviceName: s.deviceName,
      startTime: s.startTime.toISOString(),
      endTime: s.endTime?.toISOString() ?? null,
      durationMinutes: s.durationMinutes,
      cost: s.cost,
      status: s.status,
    }));

    const reversed = [...result].reverse();
    res.json(reversed);
  } catch (err) {
    res.status(500).json({ error: "Failed to get session history" });
  }
});

export default router;

import { Router } from "express";
import { db, sessionsTable, devicesTable } from "@workspace/db";
import { eq, gte, and } from "drizzle-orm";

const router = Router();

router.get("/revenue/today", async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const sessions = await db
      .select()
      .from(sessionsTable)
      .where(gte(sessionsTable.startTime, todayStart));

    const ended = sessions.filter((s) => s.status === "ended");
    const totalRevenue = ended.reduce((sum, s) => sum + (s.cost ?? 0), 0);
    const totalMinutes = ended.reduce((sum, s) => sum + s.durationMinutes, 0);

    res.json({
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalSessions: ended.length,
      totalMinutes,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to get today revenue" });
  }
});

router.get("/revenue/monthly", async (req, res) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const sessions = await db
      .select()
      .from(sessionsTable)
      .where(
        and(
          gte(sessionsTable.startTime, monthStart),
          eq(sessionsTable.status, "ended")
        )
      );

    const dailyMap: Record<string, { revenue: number; sessions: number }> = {};

    for (const session of sessions) {
      const dateKey = new Date(session.startTime).toISOString().slice(0, 10);
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = { revenue: 0, sessions: 0 };
      }
      dailyMap[dateKey].revenue += session.cost ?? 0;
      dailyMap[dateKey].sessions += 1;
    }

    const dailyBreakdown = Object.entries(dailyMap)
      .map(([date, data]) => ({
        date,
        revenue: Math.round(data.revenue * 100) / 100,
        sessions: data.sessions,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const totalRevenue = sessions.reduce((sum, s) => sum + (s.cost ?? 0), 0);
    const daysWithRevenue = dailyBreakdown.filter((d) => d.revenue > 0);
    const mostProfitableDay =
      daysWithRevenue.length > 0
        ? daysWithRevenue.reduce((best, d) => (d.revenue > best.revenue ? d : best))
            .date
        : null;
    const averageDaily =
      dailyBreakdown.length > 0 ? totalRevenue / dailyBreakdown.length : 0;

    res.json({
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      dailyBreakdown,
      mostProfitableDay,
      averageDaily: Math.round(averageDaily * 100) / 100,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to get monthly revenue" });
  }
});

router.get("/stats", async (req, res) => {
  try {
    const sessions = await db.select().from(sessionsTable);
    const devices = await db.select().from(devicesTable);

    const ended = sessions.filter((s) => s.status === "ended");
    const active = sessions.filter(
      (s) => s.status === "active" || s.status === "expired"
    );

    const totalSessions = ended.length;
    const totalMinutes = ended.reduce((sum, s) => sum + s.durationMinutes, 0);

    const deviceUsageMap: Record<number, number> = {};
    for (const s of ended) {
      deviceUsageMap[s.deviceId] = (deviceUsageMap[s.deviceId] ?? 0) + 1;
    }

    let mostUsedDeviceId: number | null = null;
    let maxUsage = 0;
    for (const [id, count] of Object.entries(deviceUsageMap)) {
      if (count > maxUsage) {
        maxUsage = count;
        mostUsedDeviceId = Number(id);
      }
    }

    const mostUsedDevice = mostUsedDeviceId
      ? devices.find((d) => d.id === mostUsedDeviceId)?.name ?? null
      : null;

    const activeDeviceIds = new Set(active.map((s) => s.deviceId));
    const activeDevices = activeDeviceIds.size;
    const availableDevices = devices.filter((d) => !activeDeviceIds.has(d.id)).length;

    res.json({
      totalSessions,
      totalMinutes,
      mostUsedDevice,
      activeDevices,
      availableDevices,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to get stats" });
  }
});

export default router;

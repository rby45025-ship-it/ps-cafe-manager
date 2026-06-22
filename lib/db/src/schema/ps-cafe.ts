import { pgTable, serial, text, integer, real, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const devicesTable = pgTable("devices", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  hourlyRate: real("hourly_rate").notNull().default(20),
});

export const insertDeviceSchema = createInsertSchema(devicesTable).omit({ id: true });
export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type Device = typeof devicesTable.$inferSelect;

export const sessionsTable = pgTable("sessions", {
  id: serial("id").primaryKey(),
  deviceId: integer("device_id").notNull().references(() => devicesTable.id),
  startTime: timestamp("start_time", { withTimezone: true }).notNull().defaultNow(),
  endTime: timestamp("end_time", { withTimezone: true }),
  durationMinutes: integer("duration_minutes").notNull(),
  cost: real("cost"),
  status: text("status").notNull().default("active"), // active | ended | expired
});

export const insertSessionSchema = createInsertSchema(sessionsTable).omit({ id: true });
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessionsTable.$inferSelect;

export const alarmStateTable = pgTable("alarm_state", {
  id: serial("id").primaryKey(),
  deviceId: integer("device_id").notNull().references(() => devicesTable.id),
  active: boolean("active").notNull().default(false),
  lastTriggeredAt: timestamp("last_triggered_at", { withTimezone: true }),
});

export const insertAlarmStateSchema = createInsertSchema(alarmStateTable).omit({ id: true });
export type InsertAlarmState = z.infer<typeof insertAlarmStateSchema>;
export type AlarmState = typeof alarmStateTable.$inferSelect;

export const appSettingsTable = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  startWithWindows: boolean("start_with_windows").notNull().default(false),
});

export const insertAppSettingsSchema = createInsertSchema(appSettingsTable).omit({ id: true });
export type InsertAppSettings = z.infer<typeof insertAppSettingsSchema>;
export type AppSettings = typeof appSettingsTable.$inferSelect;

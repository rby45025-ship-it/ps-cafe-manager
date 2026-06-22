import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const BASE = "/api";

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ActiveSession {
  id: number;
  deviceId: number;
  startTime: string;
  endTime: string | null;
  durationMinutes: number;
  remainingSeconds: number;
  cost: number | null;
  status: string;
}

export interface Device {
  id: number;
  name: string;
  hourlyRate: number;
  status: "available" | "in_use" | "expired";
  activeSession: ActiveSession | null;
  alarmActive: boolean;
}

export interface TodayRevenue {
  totalRevenue: number;
  totalSessions: number;
  totalMinutes: number;
}

export interface MonthlyRevenue {
  totalRevenue: number;
  averageDaily: number;
  mostProfitableDay: string | null;
  dailyBreakdown: { date: string; revenue: number; sessions: number }[];
}

export interface Stats {
  totalSessions: number;
  totalMinutes: number;
  activeDevices: number;
  availableDevices: number;
  mostUsedDevice: string | null;
}

export interface SessionHistory {
  id: number;
  deviceId: number;
  deviceName: string;
  startTime: string;
  endTime: string | null;
  durationMinutes: number;
  cost: number | null;
  status: string;
}

// ─── Query keys ──────────────────────────────────────────────────────────────

export const KEYS = {
  devices: ["/api/devices"],
  today: ["/api/revenue/today"],
  monthly: ["/api/revenue/monthly"],
  stats: ["/api/stats"],
  history: ["/api/sessions/history"],
  settings: ["/api/settings"],
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useDevices() {
  return useQuery<Device[]>({
    queryKey: KEYS.devices,
    queryFn: () => apiFetch("/devices"),
    refetchInterval: 5000,
  });
}

export function useTodayRevenue() {
  return useQuery<TodayRevenue>({
    queryKey: KEYS.today,
    queryFn: () => apiFetch("/revenue/today"),
  });
}

export function useMonthlyRevenue() {
  return useQuery<MonthlyRevenue>({
    queryKey: KEYS.monthly,
    queryFn: () => apiFetch("/revenue/monthly"),
  });
}

export function useStats() {
  return useQuery<Stats>({
    queryKey: KEYS.stats,
    queryFn: () => apiFetch("/stats"),
  });
}

export function useSessionHistory() {
  return useQuery<SessionHistory[]>({
    queryKey: KEYS.history,
    queryFn: () => apiFetch("/sessions/history"),
  });
}

export function useSettings() {
  return useQuery<{ id: number; startWithWindows: boolean }>({
    queryKey: KEYS.settings,
    queryFn: () => apiFetch("/settings"),
  });
}

export function useStartSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { deviceId: number; durationMinutes: number }) =>
      apiFetch("/sessions/start", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.devices }),
  });
}

export function useEndSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/sessions/${id}/end`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.devices }),
  });
}

export function useAddTime() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, minutes }: { id: number; minutes: number }) =>
      apiFetch(`/sessions/${id}/addtime`, { method: "POST", body: JSON.stringify({ minutes }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.devices }),
  });
}

export function useSetAlarm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ deviceId, active }: { deviceId: number; active: boolean }) =>
      apiFetch(`/alarm/${deviceId}`, { method: "POST", body: JSON.stringify({ active }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.devices }),
  });
}

export function useAddDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; hourlyRate: number }) =>
      apiFetch("/devices", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.devices }),
  });
}

export function useUpdateDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name, hourlyRate }: { id: number; name: string; hourlyRate: number }) =>
      apiFetch(`/devices/${id}`, { method: "PATCH", body: JSON.stringify({ name, hourlyRate }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.devices }),
  });
}

export function useDeleteDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/devices/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.devices }),
  });
}

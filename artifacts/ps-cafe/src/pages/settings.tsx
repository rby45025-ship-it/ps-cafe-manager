import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetTodayRevenue,
  useGetMonthlyRevenue,
  useGetStats,
  useGetDevices,
  useUpdateDevice,
  getGetDevicesQueryKey,
} from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const API = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

export default function Settings() {
  const queryClient = useQueryClient();
  const { data: todayRevenue, isLoading: lt } = useGetTodayRevenue();
  const { data: monthlyRevenue, isLoading: lm } = useGetMonthlyRevenue();
  const { data: stats, isLoading: ls } = useGetStats();
  const { data: devices, isLoading: ld } = useGetDevices();
  const updateDevice = useUpdateDevice();

  const [deviceEdits, setDeviceEdits] = useState<Record<number, { name: string; rate: string }>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [newName, setNewName] = useState("");
  const [newRate, setNewRate] = useState("");
  const [adding, setAdding] = useState(false);
  const [showMonthlyDays, setShowMonthlyDays] = useState(false);

  const getEdit = (id: number, name: string, rate: number) =>
    deviceEdits[id] ?? { name, rate: rate.toString() };

  const setEdit = (id: number, field: "name" | "rate", value: string) =>
    setDeviceEdits((p) => ({ ...p, [id]: { ...getEdit(id, "", 0), [field]: value } }));

  const handleSave = async (device: { id: number; name: string; hourlyRate: number }) => {
    const edit = deviceEdits[device.id] ?? { name: device.name, rate: device.hourlyRate.toString() };
    setSavingId(device.id);
    try {
      await fetch(`${API}/api/devices/${device.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: edit.name, hourlyRate: parseFloat(edit.rate) }),
      });
      queryClient.invalidateQueries({ queryKey: getGetDevicesQueryKey() });
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("هل تريد حذف هذا الجهاز؟")) return;
    setDeletingId(id);
    try {
      await fetch(`${API}/api/devices/${id}`, { method: "DELETE" });
      queryClient.invalidateQueries({ queryKey: getGetDevicesQueryKey() });
    } finally {
      setDeletingId(null);
    }
  };

  const handleAdd = async () => {
    if (!newName.trim() || !newRate) return;
    setAdding(true);
    try {
      await fetch(`${API}/api/devices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), hourlyRate: parseFloat(newRate) }),
      });
      setNewName("");
      setNewRate("");
      queryClient.invalidateQueries({ queryKey: getGetDevicesQueryKey() });
    } finally {
      setAdding(false);
    }
  };

  const fmtHours = (mins: number) => ((mins ?? 0) / 60).toFixed(1);
  const now = new Date();
  const monthName = now.toLocaleDateString("ar-EG", { month: "long", year: "numeric" });

  // Build full month day list (all days 1→last, filled with data or 0)
  const allMonthDays = (() => {
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = now.getDate();

    const dailyMap: Record<string, { revenue: number; sessions: number }> = {};
    for (const d of monthlyRevenue?.dailyBreakdown ?? []) {
      dailyMap[d.date] = { revenue: d.revenue, sessions: d.sessions };
    }

    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dayName = new Date(year, month, day).toLocaleDateString("ar-EG", { weekday: "long" });
      const data = dailyMap[dateKey];
      return {
        day,
        dateKey,
        dayName,
        revenue: data?.revenue ?? 0,
        sessions: data?.sessions ?? 0,
        isFuture: day > today,
        isToday: day === today,
      };
    });
  })();

  const maxRevenue = Math.max(...allMonthDays.map((d) => d.revenue), 1);

  if (lt || lm || ls || ld) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {[0,1,2].map(i => <Skeleton key={i} className="h-28 rounded-xl bg-white/5" />)}
        </div>
        <Skeleton className="h-64 rounded-xl bg-white/5" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">

      {/* ── 3 Stat cards (match screenshot 51) ── */}
      <div className="grid grid-cols-3 gap-4">

        {/* إيرادات اليوم */}
        <div className="rounded-xl bg-[#0f0f18] border border-white/8 p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5 19.79 19.79 0 0 1 1.65 5.1 2 2 0 0 1 3.62 3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l.72-.72a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
          </div>
          <div className="flex-1 text-right min-w-0">
            <p className="text-muted-foreground text-xs mb-1">إيرادات اليوم</p>
            <p className="text-2xl font-black text-white truncate">{todayRevenue?.totalRevenue?.toFixed(2)} جنيه</p>
            <p className="text-muted-foreground text-xs mt-0.5">
              {todayRevenue?.totalSessions} جلسة • {fmtHours(todayRevenue?.totalMinutes ?? 0)} ساعة
            </p>
          </div>
        </div>

        {/* إيرادات الشهر — قابل للضغط */}
        <div
          className={`rounded-xl bg-[#0f0f18] border p-5 flex items-center gap-4 cursor-pointer select-none transition-all duration-200 ${showMonthlyDays ? "border-primary/50 ring-1 ring-primary/20" : "border-white/8 hover:border-white/20"}`}
          onClick={() => setShowMonthlyDays((v) => !v)}
        >
          <div className="w-11 h-11 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
              <polyline points="17 6 23 6 23 12"/>
            </svg>
          </div>
          <div className="flex-1 text-right min-w-0">
            <p className="text-muted-foreground text-xs mb-1">إيرادات {monthName}</p>
            <p className="text-2xl font-black text-white truncate">{monthlyRevenue?.totalRevenue?.toFixed(2)} جنيه</p>
            <p className="text-muted-foreground text-xs mt-0.5">
              {stats?.totalSessions} جلسة • {fmtHours(stats?.totalMinutes ?? 0)} ساعة
            </p>
          </div>
          {/* Chevron indicator */}
          <svg
            xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.5"
            className={`text-primary flex-shrink-0 transition-transform duration-300 ${showMonthlyDays ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>

        {/* الأجهزة النشطة */}
        <div className="rounded-xl bg-[#0f0f18] border border-white/8 p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
              <rect x="2" y="3" width="20" height="14" rx="2"/>
              <line x1="8" y1="21" x2="16" y2="21"/>
              <line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
          </div>
          <div className="flex-1 text-right">
            <p className="text-muted-foreground text-xs mb-1">الأجهزة النشطة الآن</p>
            <p className="text-4xl font-black text-white">
              {devices?.length ?? 0} / {stats?.activeDevices ?? 0}
            </p>
          </div>
        </div>
      </div>

      {/* ── تفاصيل أيام الشهر (تظهر عند الضغط على كارت الشهر) ── */}
      {showMonthlyDays && (
        <div className="rounded-xl bg-[#0f0f18] border border-primary/30 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
            <span className="text-muted-foreground text-sm">
              {allMonthDays.filter((d) => d.revenue > 0).length} يوم به إيرادات
            </span>
            <h3 className="text-base font-bold text-primary">تفاصيل كل أيام {monthName}</h3>
          </div>

          {/* Days list — scrollable */}
          <div className="max-h-[420px] overflow-y-auto">
            {allMonthDays.map((d) => {
              const barPct = d.revenue > 0 ? Math.max(4, (d.revenue / maxRevenue) * 100) : 0;
              return (
                <div
                  key={d.dateKey}
                  className={`flex items-center gap-4 px-5 py-3 border-b border-white/5 last:border-0 transition-colors ${
                    d.isToday ? "bg-primary/8" : d.isFuture ? "opacity-35" : d.revenue > 0 ? "hover:bg-white/3" : ""
                  }`}
                >
                  {/* Revenue bar */}
                  <div className="w-24 h-2 rounded-full bg-white/8 overflow-hidden flex-shrink-0">
                    {!d.isFuture && (
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${barPct}%`,
                          background: d.revenue > 0 ? "hsl(var(--primary))" : "transparent",
                        }}
                      />
                    )}
                  </div>

                  {/* Revenue + sessions */}
                  <div className="flex-1 flex items-center justify-end gap-3">
                    {d.sessions > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {d.sessions} جلسة
                      </span>
                    )}
                    <span
                      className={`text-sm font-bold min-w-[90px] text-left ${
                        d.revenue > 0 ? "text-primary" : d.isFuture ? "text-white/20" : "text-white/30"
                      }`}
                    >
                      {d.isFuture ? "—" : `${d.revenue.toFixed(2)} جنيه`}
                    </span>
                  </div>

                  {/* Day name + number */}
                  <div className="text-right flex-shrink-0 w-28">
                    <div className={`text-sm font-bold ${d.isToday ? "text-primary" : "text-white"}`}>
                      {d.isToday ? "📍 " : ""}{d.dayName}
                    </div>
                    <div className="text-xs text-muted-foreground">{d.day} {monthName}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer summary */}
          <div className="flex items-center justify-between px-5 py-4 border-t border-white/8 bg-white/3">
            <span className="text-primary font-black text-lg">{monthlyRevenue?.totalRevenue?.toFixed(2)} جنيه</span>
            <span className="text-muted-foreground text-sm">إجمالي إيرادات {monthName}</span>
          </div>
        </div>
      )}

      {/* ── إعدادات الأجهزة ── */}
      <div>
        <h2 className="text-3xl font-black text-right mb-5">إعدادات الأجهزة</h2>

        <div className="space-y-3">
          {devices?.map((device) => {
            const edit = getEdit(device.id, device.name, device.hourlyRate);
            return (
              <div key={device.id} className="rounded-xl bg-[#0f0f18] border border-white/8 p-5">
                {/* Title */}
                <p className="text-lg font-bold text-primary text-right mb-4">
                  تعديل {device.name}
                </p>

                {/* Fields + Save button in one flex row */}
                <div className="flex items-end gap-3">
                  {/* اسم الجهاز — first child = RIGHT in RTL */}
                  <div className="flex-1 space-y-1.5">
                    <label className="text-xs text-muted-foreground block text-right">اسم الجهاز</label>
                    <Input
                      value={edit.name}
                      onChange={(e) => setEdit(device.id, "name", e.target.value)}
                      className="bg-black/60 border-white/10 text-white text-right"
                    />
                  </div>
                  {/* السعر — second child = MIDDLE */}
                  <div className="w-36 space-y-1.5">
                    <label className="text-xs text-muted-foreground block text-right">السعر في الساعة (جنيه)</label>
                    <Input
                      type="number"
                      value={edit.rate}
                      onChange={(e) => setEdit(device.id, "rate", e.target.value)}
                      className="bg-black/60 border-white/10 text-white text-right"
                    />
                  </div>
                  {/* حفظ button — last child = LEFT in RTL */}
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      onClick={() => handleSave(device)}
                      disabled={savingId === device.id}
                      className="bg-primary hover:bg-primary/85 flex items-center gap-2 h-10 px-5"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                        <polyline points="17 21 17 13 7 13 7 21"/>
                        <polyline points="7 3 7 8 15 8"/>
                      </svg>
                      حفظ
                    </Button>
                    <Button
                      onClick={() => handleDelete(device.id)}
                      disabled={deletingId === device.id}
                      variant="outline"
                      className="border-red-800/50 text-red-400 hover:bg-red-900/20 h-10 px-3"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                      </svg>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* ── إضافة جهاز جديد ── */}
          <div className="rounded-xl bg-[#0f0f18] border border-primary/30 p-5">
            <p className="text-lg font-bold text-primary text-right mb-4">إضافة جهاز جديد</p>
            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-1.5">
                <label className="text-xs text-muted-foreground block text-right">اسم الجهاز</label>
                <Input
                  placeholder="مثال: PlayStation 7"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="bg-black/60 border-white/10 text-white text-right"
                />
              </div>
              <div className="w-36 space-y-1.5">
                <label className="text-xs text-muted-foreground block text-right">السعر في الساعة (جنيه)</label>
                <Input
                  type="number"
                  placeholder="20"
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value)}
                  className="bg-black/60 border-white/10 text-white text-right"
                />
              </div>
              <Button
                onClick={handleAdd}
                disabled={adding || !newName.trim() || !newRate}
                className="bg-green-700 hover:bg-green-600 flex items-center gap-2 h-10 px-5 flex-shrink-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                إضافة
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

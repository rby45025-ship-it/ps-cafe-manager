import { useState } from "react";
import {
  useDevices, useTodayRevenue, useMonthlyRevenue, useStats,
  useUpdateDevice, useDeleteDevice, useAddDevice,
} from "@/api";

const PRIMARY = "#8b5cf6";

const cardStyle: React.CSSProperties = {
  borderRadius: 12, background: "#0f0f18", border: "1px solid rgba(255,255,255,0.07)", padding: 20,
};

const inputStyle: React.CSSProperties = {
  background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
  color: "#fff", fontFamily: "Cairo", fontSize: 14, textAlign: "right", height: 40, width: "100%",
  outline: "none", padding: "0 12px",
};

const btnStyle = (bg: string, extra?: React.CSSProperties): React.CSSProperties => ({
  background: bg, color: "#fff", border: "none", borderRadius: 8, fontFamily: "Cairo", fontWeight: 700,
  fontSize: 14, cursor: "pointer", height: 40, display: "flex", alignItems: "center", gap: 6, padding: "0 16px",
  flexShrink: 0, ...extra,
});

export default function Settings() {
  const { data: devices } = useDevices();
  const { data: today } = useTodayRevenue();
  const { data: monthly } = useMonthlyRevenue();
  const { data: stats } = useStats();

  const updateDevice = useUpdateDevice();
  const deleteDevice = useDeleteDevice();
  const addDevice = useAddDevice();

  const [edits, setEdits] = useState<Record<number, { name: string; rate: string }>>({});
  const [newName, setNewName] = useState("");
  const [newRate, setNewRate] = useState("");

  const fmtHours = (m: number) => ((m ?? 0) / 60).toFixed(1);
  const now = new Date();
  const monthName = now.toLocaleDateString("ar-EG", { month: "long", year: "numeric" });

  const getEdit = (id: number, name: string, rate: number) =>
    edits[id] ?? { name, rate: String(rate) };

  const setEdit = (id: number, f: "name" | "rate", v: string) =>
    setEdits((p) => ({ ...p, [id]: { ...getEdit(id, "", 0), [f]: v } }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 40 }}>

      {/* ── 3 Stat cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {/* Today */}
        <div style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(139,92,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={PRIMARY} strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5 19.79 19.79 0 0 1 1.65 5.1 2 2 0 0 1 3.62 3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l.72-.72a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
          </div>
          <div style={{ flex: 1, textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>إيرادات اليوم</div>
            <div style={{ fontSize: 22, fontWeight: 900 }}>{today?.totalRevenue?.toFixed(2)} جنيه</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{today?.totalSessions} جلسة • {fmtHours(today?.totalMinutes ?? 0)} ساعة</div>
          </div>
        </div>

        {/* Monthly */}
        <div style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(139,92,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={PRIMARY} strokeWidth="2">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
            </svg>
          </div>
          <div style={{ flex: 1, textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>إيرادات {monthName}</div>
            <div style={{ fontSize: 22, fontWeight: 900 }}>{monthly?.totalRevenue?.toFixed(2)} جنيه</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{stats?.totalSessions} جلسة • {fmtHours(stats?.totalMinutes ?? 0)} ساعة</div>
          </div>
        </div>

        {/* Active Devices */}
        <div style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(139,92,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={PRIMARY} strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
          </div>
          <div style={{ flex: 1, textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>الأجهزة النشطة الآن</div>
            <div style={{ fontSize: 32, fontWeight: 900 }}>{devices?.length ?? 0} / {stats?.activeDevices ?? 0}</div>
          </div>
        </div>
      </div>

      {/* ── إعدادات الأجهزة ── */}
      <div>
        <h2 style={{ fontSize: 28, fontWeight: 900, textAlign: "right", marginBottom: 20 }}>إعدادات الأجهزة</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {devices?.map((device) => {
            const edit = getEdit(device.id, device.name, device.hourlyRate);
            return (
              <div key={device.id} style={cardStyle}>
                <div style={{ fontSize: 16, fontWeight: 700, color: PRIMARY, textAlign: "right", marginBottom: 16 }}>
                  تعديل {device.name}
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
                  {/* اسم الجهاز — first = RIGHT in RTL */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", textAlign: "right", marginBottom: 6 }}>اسم الجهاز</div>
                    <input style={inputStyle} value={edit.name} onChange={(e) => setEdit(device.id, "name", e.target.value)} />
                  </div>
                  {/* السعر */}
                  <div style={{ width: 140 }}>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", textAlign: "right", marginBottom: 6 }}>السعر في الساعة (جنيه)</div>
                    <input style={inputStyle} type="number" value={edit.rate} onChange={(e) => setEdit(device.id, "rate", e.target.value)} />
                  </div>
                  {/* حفظ — last = LEFT in RTL */}
                  <button onClick={() => updateDevice.mutate({ id: device.id, name: edit.name, hourlyRate: parseFloat(edit.rate) })}
                    disabled={updateDevice.isPending}
                    style={btnStyle(PRIMARY)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                      <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
                    </svg>
                    حفظ
                  </button>
                  <button onClick={() => { if (confirm("هل تريد حذف هذا الجهاز؟")) deleteDevice.mutate(device.id); }}
                    style={btnStyle("transparent", { border: "1px solid rgba(220,38,38,0.4)", color: "#f87171" })}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}

          {/* إضافة جهاز */}
          <div style={{ ...cardStyle, border: "1px solid rgba(139,92,246,0.3)" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: PRIMARY, textAlign: "right", marginBottom: 16 }}>
              إضافة جهاز جديد
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", textAlign: "right", marginBottom: 6 }}>اسم الجهاز</div>
                <input style={inputStyle} placeholder="مثال: PlayStation 7" value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
              <div style={{ width: 140 }}>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", textAlign: "right", marginBottom: 6 }}>السعر في الساعة (جنيه)</div>
                <input style={inputStyle} type="number" placeholder="20" value={newRate} onChange={(e) => setNewRate(e.target.value)} />
              </div>
              <button
                onClick={() => { if (newName && newRate) { addDevice.mutate({ name: newName, hourlyRate: parseFloat(newRate) }); setNewName(""); setNewRate(""); } }}
                disabled={addDevice.isPending || !newName || !newRate}
                style={btnStyle("#16a34a")}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                إضافة
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

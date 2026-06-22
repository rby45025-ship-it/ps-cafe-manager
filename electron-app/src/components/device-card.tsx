import { useState, useEffect } from "react";
import { Device, useStartSession, useEndSession, useAddTime, useSetAlarm } from "@/api";

const PRIMARY = "#8b5cf6";
const RED = "#b91c1c";

export default function DeviceCard({ device }: { device: Device }) {
  const startSession = useStartSession();
  const endSession = useEndSession();
  const addTime = useAddTime();
  const setAlarm = useSetAlarm();

  const [isEndOpen, setIsEndOpen] = useState(false);
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [minutes, setMinutes] = useState("1");
  const [localRemaining, setLocalRemaining] = useState<number | null>(null);

  const { activeSession } = device;
  const isAvailable = device.status === "available";
  const isExpired = device.status === "expired";

  useEffect(() => {
    if (activeSession?.remainingSeconds != null) {
      setLocalRemaining(activeSession.remainingSeconds);
    } else {
      setLocalRemaining(null);
    }
  }, [activeSession?.remainingSeconds]);

  useEffect(() => {
    if (localRemaining === null || localRemaining <= 0 || isAvailable || isExpired) return;
    const t = setInterval(() => {
      setLocalRemaining((p) => {
        if (p === null) return null;
        if (p <= 1) {
          clearInterval(t);
          setAlarm.mutate({ deviceId: device.id, active: true });
          return 0;
        }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [localRemaining, isAvailable, isExpired]);

  const fmt = (s: number) => {
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });

  const expectedCost = () => ((parseInt(minutes) || 0) / 60 * device.hourlyRate).toFixed(2);

  const elapsedMin = () => {
    if (!activeSession) return 0;
    return Math.max(0, activeSession.durationMinutes - Math.floor((localRemaining || 0) / 60));
  };

  const currentCost = () => {
    if (!activeSession) return 0;
    return (elapsedMin() / 60) * device.hourlyRate;
  };

  const cardStyle: React.CSSProperties = {
    borderRadius: 16,
    padding: 20,
    minHeight: 240,
    display: "flex",
    flexDirection: "column",
    ...(isExpired
      ? { background: RED, border: `2px solid #ef4444`, boxShadow: "0 0 30px rgba(220,38,38,0.5)" }
      : { background: "rgba(15,15,20,0.85)", border: "1px solid rgba(255,255,255,0.08)" }),
  };

  const btn = (style: React.CSSProperties, onClick: () => void, children: React.ReactNode, disabled?: boolean) => (
    <button onClick={onClick} disabled={disabled}
      style={{ borderRadius: 12, fontFamily: "Cairo", fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1, border: "none", ...style }}>
      {children}
    </button>
  );

  const inputStyle: React.CSSProperties = {
    background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8, color: "#fff", fontFamily: "Cairo", fontSize: 18, fontWeight: 700,
    textAlign: "center", height: 44, width: "100%", outline: "none", padding: "0 8px",
  };

  return (
    <>
      <div style={cardStyle}>
        {isExpired && (
          <div style={{ textAlign: "center", marginBottom: 8, fontSize: 18, fontWeight: 900 }}>
            ⏰ انتهى الوقت! ⏰
          </div>
        )}

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <span style={{
            padding: "4px 12px", borderRadius: 6, fontSize: 13, fontWeight: 700,
            background: isExpired ? "#7f1d1d" : isAvailable ? PRIMARY : "rgba(139,92,246,0.2)",
            color: "#fff", border: isAvailable && !isExpired ? "none" : "1px solid rgba(255,255,255,0.2)",
          }}>
            {isExpired ? "انتهى الوقت" : isAvailable ? "متاح" : "قيد الاستخدام"}
          </span>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 18, fontWeight: 900 }}>{device.name}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>{device.hourlyRate} جنيه / ساعة</div>
          </div>
        </div>

        {isAvailable ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", marginTop: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <label style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", whiteSpace: "nowrap" }}>دقيقة</label>
              <input type="number" min="1" value={minutes} onChange={(e) => setMinutes(e.target.value)} style={inputStyle} />
            </div>
            {btn({ background: PRIMARY, color: "#fff", fontSize: 17, padding: "12px 0", marginTop: 16, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 },
              () => { if (parseInt(minutes) > 0) setIsStartOpen(true); },
              <><span>Play</span><span>▶</span></>,
              !minutes || parseInt(minutes) <= 0 || startSession.isPending
            )}
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", marginTop: 8 }}>
            <div style={{ textAlign: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 60, fontFamily: "monospace", fontWeight: 900, color: isExpired ? "#fca5a5" : PRIMARY, letterSpacing: 4 }}>
                {fmt(Math.max(0, localRemaining || 0))}
              </div>
              {activeSession && (
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 6 }}>
                  بدأت: {fmtTime(activeSession.startTime)} ص
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {[60, 30, 15].map((m) => (
                <button key={m} onClick={() => activeSession && addTime.mutate({ id: activeSession.id, minutes: m })}
                  style={{ flex: 1, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: 8, fontWeight: 700, fontFamily: "Cairo", cursor: "pointer",
                    background: isExpired ? "rgba(127,29,29,0.7)" : "rgba(255,255,255,0.05)", color: "#fff",
                    border: isExpired ? "1px solid #7f1d1d" : "1px solid rgba(255,255,255,0.1)" }}>
                  <span>{m}</span><span>+</span>
                </button>
              ))}
            </div>

            {btn({ background: "#dc2626", color: "#fff", fontSize: 15, padding: "12px 0", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 },
              () => setIsEndOpen(true),
              <><span>إنهاء الجلسة</span><span>⏹</span></>
            )}
          </div>
        )}
      </div>

      {/* End Dialog */}
      {isEndOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 24, width: 360, textAlign: "right" }}>
            <h3 style={{ fontSize: 20, fontWeight: 900, marginBottom: 16 }}>تأكيد إنهاء الجلسة</h3>
            <p style={{ marginBottom: 8 }}>الجهاز: <strong>{device.name}</strong></p>
            <p style={{ marginBottom: 8 }}>الوقت المنقضي: <strong>{elapsedMin()} دقيقة</strong></p>
            <p style={{ marginBottom: 20 }}>التكلفة الحالية: <strong style={{ color: PRIMARY, fontSize: 20 }}>{currentCost().toFixed(2)} جنيه</strong></p>
            <div style={{ display: "flex", gap: 8 }}>
              {btn({ background: "#dc2626", color: "#fff", fontSize: 15, padding: "10px 0", flex: 1 }, () => {
                if (!activeSession) return;
                endSession.mutate(activeSession.id);
                setIsEndOpen(false);
              }, "تأكيد الإنهاء", endSession.isPending)}
              {btn({ background: "transparent", color: "#fff", fontSize: 15, padding: "10px 0", flex: 1, border: "1px solid rgba(255,255,255,0.2)", borderRadius: 12 }, () => setIsEndOpen(false), "إلغاء")}
            </div>
          </div>
        </div>
      )}

      {/* Start Dialog */}
      {isStartOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 24, width: 360, textAlign: "right" }}>
            <h3 style={{ fontSize: 20, fontWeight: 900, marginBottom: 16 }}>تأكيد بدء الجلسة</h3>
            <p style={{ marginBottom: 8 }}>الجهاز: <strong>{device.name}</strong></p>
            <p style={{ marginBottom: 8 }}>المدة: <strong>{minutes} دقيقة</strong></p>
            <p style={{ marginBottom: 20 }}>التكلفة المتوقعة: <strong style={{ color: PRIMARY, fontSize: 20 }}>{expectedCost()} جنيه</strong></p>
            <div style={{ display: "flex", gap: 8 }}>
              {btn({ background: PRIMARY, color: "#fff", fontSize: 15, padding: "10px 0", flex: 1 }, () => {
                startSession.mutate({ deviceId: device.id, durationMinutes: parseInt(minutes) });
                setIsStartOpen(false);
                setMinutes("1");
              }, startSession.isPending ? "جاري البدء..." : "تأكيد البدء", startSession.isPending)}
              {btn({ background: "transparent", color: "#fff", fontSize: 15, padding: "10px 0", flex: 1, border: "1px solid rgba(255,255,255,0.2)", borderRadius: 12 }, () => setIsStartOpen(false), "إلغاء")}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

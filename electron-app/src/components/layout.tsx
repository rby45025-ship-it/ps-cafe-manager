import { useEffect, useRef } from "react";
import { Link } from "wouter";
import { useDevices, useSetAlarm } from "@/api";

function AlarmSystem() {
  const { data: devices } = useDevices();
  const setAlarm = useSetAlarm();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio("/alarm.mp3");
      audioRef.current.loop = true;
    }
    if (devices) {
      const anyAlarm = devices.some((d) => d.status === "expired" || d.alarmActive);
      if (anyAlarm) {
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }
    return () => { audioRef.current?.pause(); };
  }, [devices]);

  return null;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: "#0d0d0d", color: "#fff" }}>
      <AlarmSystem />
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(10,10,15,0.9)", position: "sticky", top: 0, zIndex: 50,
      }}>
        <Link href="/settings" style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.5)", textDecoration: "none", fontSize: 15 }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          الإعدادات
        </Link>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", fontSize: 22, fontWeight: 900 }}>
          <span style={{ color: "#fff" }}>PlayStation</span>
          <span style={{ color: "#8b5cf6" }}>كافيه</span>
          <span style={{ color: "#8b5cf6", fontSize: 26 }}>🎮</span>
        </Link>
      </header>
      <main style={{ flex: 1, padding: "20px", maxWidth: 1280, margin: "0 auto", width: "100%" }}>
        {children}
      </main>
    </div>
  );
}

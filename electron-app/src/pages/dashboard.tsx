import { useDevices } from "@/api";
import DeviceCard from "@/components/device-card";

export default function Dashboard() {
  const { data: devices, isLoading } = useDevices();

  if (isLoading) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ height: 280, borderRadius: 16, background: "rgba(255,255,255,0.03)", animation: "pulse 2s infinite" }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
      {devices?.map((device) => (
        <DeviceCard key={device.id} device={device} />
      ))}
    </div>
  );
}

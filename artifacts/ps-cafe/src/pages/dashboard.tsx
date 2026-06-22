import { useGetDevices } from "@workspace/api-client-react";
import DeviceCard from "@/components/device-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: devices, isLoading } = useGetDevices({
    query: { refetchInterval: 5000, queryKey: ['/api/devices'] },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-80 w-full rounded-xl bg-white/5" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {devices?.map((device) => (
        <DeviceCard key={device.id} device={device} />
      ))}
    </div>
  );
}

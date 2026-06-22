import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Device,
  useStartSession,
  useEndSession,
  useAddTime,
  useSetAlarm,
  getGetDevicesQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function DeviceCard({ device }: { device: Device }) {
  const queryClient = useQueryClient();
  const startSession = useStartSession();
  const endSession = useEndSession();
  const addTime = useAddTime();
  const setAlarm = useSetAlarm();

  const [isEndOpen, setIsEndOpen] = useState(false);
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [minutes, setMinutes] = useState("1");

  const activeSession = device.activeSession;
  const isAvailable = device.status === "available";
  const isExpired = device.status === "expired";

  const [localRemaining, setLocalRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (activeSession?.remainingSeconds !== undefined && activeSession?.remainingSeconds !== null) {
      setLocalRemaining(activeSession.remainingSeconds);
    } else {
      setLocalRemaining(null);
    }
  }, [activeSession?.remainingSeconds]);

  useEffect(() => {
    if (localRemaining === null || localRemaining <= 0 || isAvailable || isExpired) return;
    const interval = setInterval(() => {
      setLocalRemaining((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(interval);
          setAlarm.mutate({ deviceId: device.id, data: { active: true } });
          queryClient.invalidateQueries({ queryKey: getGetDevicesQueryKey() });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [localRemaining, isAvailable, isExpired, device.id]);

  const formatTime = (seconds: number) => {
    const totalMins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${totalMins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatStartTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString("ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleStart = () => {
    const totalMins = parseInt(minutes) || 0;
    if (totalMins <= 0) return;
    setIsStartOpen(true);
  };

  const confirmStart = () => {
    const totalMins = parseInt(minutes) || 0;
    if (totalMins <= 0) return;
    startSession.mutate(
      { data: { deviceId: device.id, durationMinutes: totalMins } },
      {
        onSuccess: () => {
          setMinutes("1");
          setIsStartOpen(false);
          queryClient.invalidateQueries({ queryKey: getGetDevicesQueryKey() });
        },
      }
    );
  };

  const handleEnd = () => {
    if (!activeSession) return;
    endSession.mutate(
      { id: activeSession.id },
      {
        onSuccess: () => {
          setIsEndOpen(false);
          queryClient.invalidateQueries({ queryKey: getGetDevicesQueryKey() });
        },
      }
    );
  };

  const handleAddTime = (mins: number) => {
    if (!activeSession) return;
    addTime.mutate(
      { id: activeSession.id, data: { minutes: mins } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetDevicesQueryKey() });
        },
      }
    );
  };

  const expectedCost = () => {
    const mins = parseInt(minutes) || 0;
    return ((mins / 60) * device.hourlyRate).toFixed(2);
  };

  const elapsedMinutes = () => {
    if (!activeSession) return 0;
    return Math.max(0, activeSession.durationMinutes - Math.floor((localRemaining || 0) / 60));
  };

  const currentCost = () => {
    if (!activeSession) return 0;
    if (activeSession.cost) return activeSession.cost;
    return (elapsedMinutes() / 60) * device.hourlyRate;
  };

  if (isExpired) {
    return (
      <>
        <div className="device-card-expired rounded-2xl flex flex-col p-5 min-h-[280px]">
          <div className="text-center mb-3">
            <h3 className="text-xl font-bold text-white">⏰ انتهى الوقت! ⏰</h3>
          </div>

          <div className="flex items-center justify-between mb-2">
            <span className="px-3 py-1 rounded-md text-sm font-bold text-white bg-red-900 border border-red-700">
              انتهى الوقت
            </span>
            <div className="text-right">
              <span className="text-lg font-bold text-white">{device.name}</span>
              <p className="text-red-200 text-xs">{device.hourlyRate} جنيه / ساعة</p>
            </div>
          </div>

          <div className="text-center my-3 flex-1 flex flex-col items-center justify-center">
            <div className="text-6xl font-mono font-black text-red-300 tracking-widest">
              00:00
            </div>
            {activeSession && (
              <p className="text-red-200 text-sm mt-2">
                بدأت: {formatStartTime(activeSession.startTime)} ص
              </p>
            )}
          </div>

          <div className="flex justify-between gap-2 mb-3">
            {[60, 30, 15].map((m) => (
              <button
                key={m}
                onClick={() => handleAddTime(m)}
                className="flex-1 flex items-center justify-between px-3 py-2 rounded-lg text-sm font-bold bg-red-900/70 hover:bg-red-800 text-white border border-red-700 transition-colors"
              >
                <span>{m}</span>
                <span>+</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsEndOpen(true)}
            className="w-full py-3 rounded-xl font-bold text-white text-base bg-red-700 hover:bg-red-600 transition-colors flex items-center justify-center gap-2 border border-red-500"
          >
            <span>إنهاء الجلسة</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            </svg>
          </button>
        </div>

        <Dialog open={isEndOpen} onOpenChange={setIsEndOpen}>
          <DialogContent className="sm:max-w-sm bg-[#1a1a2e] border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="text-xl text-right">تأكيد إنهاء الجلسة</DialogTitle>
            </DialogHeader>
            <div className="py-3 space-y-3 text-right">
              <p className="text-base">الجهاز: <span className="font-bold">{device.name}</span></p>
              <p className="text-base">الوقت المنقضي: <span className="font-bold">{elapsedMinutes()} دقيقة</span></p>
              <p className="text-base">التكلفة الحالية: <span className="font-bold text-primary text-lg">{currentCost().toFixed(2)} جنيه</span></p>
            </div>
            <DialogFooter className="gap-2 flex-row-reverse sm:flex-row-reverse">
              <Button variant="destructive" onClick={handleEnd} className="flex-1" disabled={endSession.isPending}>
                تأكيد الإنهاء
              </Button>
              <Button variant="outline" onClick={() => setIsEndOpen(false)} className="flex-1 border-white/15 hover:bg-white/5">
                إلغاء
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <div className="glass-card rounded-2xl flex flex-col p-5 min-h-[240px]">
        <div className="flex items-start justify-between mb-3">
          <span
            className={`px-3 py-1 rounded-md text-sm font-bold ${
              isAvailable
                ? "bg-primary text-white"
                : "bg-primary/20 text-primary border border-primary/50"
            }`}
          >
            {isAvailable ? "متاح" : "قيد الاستخدام"}
          </span>
          <div className="text-right">
            <h3 className="text-xl font-bold text-white leading-tight">{device.name}</h3>
            <p className="text-muted-foreground text-sm mt-0.5">{device.hourlyRate} جنيه / ساعة</p>
          </div>
        </div>

        {isAvailable ? (
          <div className="flex-1 flex flex-col justify-between mt-2">
            <div className="flex items-center gap-3 w-full">
              <label className="text-sm text-muted-foreground whitespace-nowrap font-medium">دقيقة</label>
              <Input
                type="number"
                min="1"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                className="flex-1 bg-black/50 border-white/10 text-white text-center text-xl font-bold h-12"
                data-testid="input-minutes"
              />
            </div>
            <Button
              className="w-full mt-4 h-13 bg-primary hover:bg-primary/85 text-white font-bold text-lg flex items-center justify-center gap-3 rounded-xl py-3"
              onClick={handleStart}
              disabled={!minutes || parseInt(minutes) <= 0 || startSession.isPending}
              data-testid="button-play"
            >
              <span>Play</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            </Button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col mt-2">
            <div className="text-center mb-3 py-1">
              <div className="text-6xl font-mono font-black text-primary tracking-widest">
                {formatTime(Math.max(0, localRemaining || 0))}
              </div>
              {activeSession && (
                <p className="text-muted-foreground text-sm mt-2">
                  بدأت: {formatStartTime(activeSession.startTime)} ص
                </p>
              )}
            </div>

            <div className="flex justify-between gap-2 mb-3">
              {[60, 30, 15].map((m) => (
                <button
                  key={m}
                  onClick={() => handleAddTime(m)}
                  className="flex-1 flex items-center justify-between px-3 py-2 rounded-lg text-sm font-bold bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors"
                  data-testid={`button-addtime-${m}`}
                >
                  <span>{m}</span>
                  <span>+</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsEndOpen(true)}
              className="w-full py-3 rounded-xl font-bold text-white text-base bg-red-700 hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
              data-testid="button-end-session"
            >
              <span>إنهاء الجلسة</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              </svg>
            </button>
          </div>
        )}
      </div>

      <Dialog open={isEndOpen} onOpenChange={setIsEndOpen}>
        <DialogContent className="sm:max-w-sm bg-[#1a1a2e] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl text-right">تأكيد إنهاء الجلسة</DialogTitle>
          </DialogHeader>
          <div className="py-3 space-y-3 text-right">
            <p className="text-base">الجهاز: <span className="font-bold">{device.name}</span></p>
            <p className="text-base">الوقت المنقضي: <span className="font-bold">{elapsedMinutes()} دقيقة</span></p>
            <p className="text-base">التكلفة الحالية: <span className="font-bold text-primary text-lg">{currentCost().toFixed(2)} جنيه</span></p>
          </div>
          <DialogFooter className="gap-2 flex-row-reverse sm:flex-row-reverse">
            <Button variant="destructive" onClick={handleEnd} className="flex-1" disabled={endSession.isPending}>
              تأكيد الإنهاء
            </Button>
            <Button variant="outline" onClick={() => setIsEndOpen(false)} className="flex-1 border-white/15 hover:bg-white/5">
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isStartOpen} onOpenChange={setIsStartOpen}>
        <DialogContent className="sm:max-w-sm bg-[#1a1a2e] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl text-right">تأكيد بدء الجلسة</DialogTitle>
          </DialogHeader>
          <div className="py-3 space-y-3 text-right">
            <p className="text-base">الجهاز: <span className="font-bold">{device.name}</span></p>
            <p className="text-base">المدة: <span className="font-bold">{minutes} دقيقة</span></p>
            <p className="text-base">التكلفة المتوقعة: <span className="font-bold text-primary text-lg">{expectedCost()} جنيه</span></p>
          </div>
          <DialogFooter className="gap-2 flex-row-reverse sm:flex-row-reverse">
            <Button
              onClick={confirmStart}
              className="flex-1 bg-primary hover:bg-primary/85"
              disabled={startSession.isPending}
            >
              {startSession.isPending ? "جاري البدء..." : "تأكيد البدء"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsStartOpen(false)}
              className="flex-1 border-white/15 hover:bg-white/5"
            >
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

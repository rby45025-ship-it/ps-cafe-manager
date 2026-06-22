import { useEffect, useRef } from 'react';
import { useGetDevices } from '@workspace/api-client-react';

// ─── Register Service Worker + request notification permission ─────────────
async function setupServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    console.log('[Alarm] SW registered:', reg.scope);
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  } catch (err) {
    console.error('[Alarm] SW failed:', err);
  }
}

function notifySW(msg: object) {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return;
  navigator.serviceWorker.controller.postMessage(msg);
}

// ─── Main hook ────────────────────────────────────────────────────────────────
export function useAlarmSystem() {
  const { data: devices } = useGetDevices({
    query: { refetchInterval: 5000, queryKey: ['/api/devices'] },
  });

  const audioRef    = useRef<HTMLAudioElement | null>(null);
  const swReady     = useRef(false);
  const prevExpired = useRef<Set<number>>(new Set());

  // Register SW once on first render
  useEffect(() => {
    if (swReady.current) return;
    swReady.current = true;
    setupServiceWorker();
  }, []);

  // Ping SW every 20 s — keeps it alive so it can poll the API in background
  useEffect(() => {
    const id = setInterval(() => notifySW({ type: 'POLL' }), 20_000);
    return () => clearInterval(id);
  }, []);

  // Audio + SW notifications whenever device list changes
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio('/alarm.mp3');
      audioRef.current.loop = true;
    }

    if (!devices) return;

    const expiredNow = new Set(
      devices
        .filter((d) => d.status === 'expired' || d.alarmActive)
        .map((d) => d.id)
    );

    // Newly expired → ask SW to show OS notification instantly
    for (const id of expiredNow) {
      if (!prevExpired.current.has(id)) {
        const device = devices.find((d) => d.id === id);
        if (device) {
          notifySW({ type: 'DEVICE_EXPIRED', deviceId: id, deviceName: device.name });
        }
      }
    }

    // No longer expired → close the notification
    for (const id of prevExpired.current) {
      if (!expiredNow.has(id)) {
        notifySW({ type: 'DEVICE_CLEARED', deviceId: id });
      }
    }

    prevExpired.current = expiredNow;

    // Play / pause alarm audio
    if (expiredNow.size > 0) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    return () => { audioRef.current?.pause(); };
  }, [devices]);
}

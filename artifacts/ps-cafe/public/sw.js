// PlayStation Cafe Manager — Service Worker Alarm
// Polls /api/devices every 15s and shows OS notification when a device expires

const POLL_MS = 15000;
const knownExpired = new Set();

async function poll() {
  try {
    const res = await fetch("/api/devices");
    if (!res.ok) return;
    const devices = await res.json();

    for (const device of devices) {
      if (device.status === "expired" && !knownExpired.has(device.id)) {
        knownExpired.add(device.id);

        await self.registration.showNotification("⏰ انتهى الوقت!", {
          body: `${device.name} — انتهت مدة الجلسة. يرجى إنهاء الجلسة.`,
          requireInteraction: true,
          tag: `alarm-${device.id}`,
          renotify: true,
          icon: "/icon.png",
          badge: "/icon.png",
          vibrate: [300, 100, 300, 100, 300],
        });
      }

      // Reset when device becomes available again
      if (device.status === "available") {
        knownExpired.delete(device.id);
      }
    }
  } catch {
    // Network unavailable — silent fail
  }
}

// ─── Install & Activate ────────────────────────────────────────────────────
self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});

// ─── Notification click → open app ────────────────────────────────────────
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        if (clients.length > 0) return clients[0].focus();
        return self.clients.openWindow("/");
      })
  );
});

// ─── Message from page ─────────────────────────────────────────────────────
// The page pings the SW every 20s to keep it alive and trigger a poll
self.addEventListener("message", (e) => {
  if (e.data?.type === "POLL") {
    e.waitUntil(poll());
  }

  // Page tells SW a device just expired (instant notification, no poll delay)
  if (e.data?.type === "DEVICE_EXPIRED") {
    const { deviceId, deviceName } = e.data;
    if (!knownExpired.has(deviceId)) {
      knownExpired.add(deviceId);
      e.waitUntil(
        self.registration.showNotification("⏰ انتهى الوقت!", {
          body: `${deviceName} — انتهت مدة الجلسة`,
          requireInteraction: true,
          tag: `alarm-${deviceId}`,
          renotify: true,
          icon: "/icon.png",
          vibrate: [300, 100, 300, 100, 300],
        })
      );
    }
  }

  // Page tells SW alarm was dismissed (session ended)
  if (e.data?.type === "DEVICE_CLEARED") {
    knownExpired.delete(e.data.deviceId);
    self.registration.getNotifications({ tag: `alarm-${e.data.deviceId}` })
      .then((notifications) => notifications.forEach((n) => n.close()));
  }
});

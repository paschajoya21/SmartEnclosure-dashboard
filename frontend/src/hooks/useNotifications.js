import { useEffect } from "react";
import { getToken, onMessage } from "firebase/messaging";
import { messaging } from "../firebase";

const VAPID_KEY = process.env.REACT_APP_FIREBASE_VAPID_KEY;

// Panggil hook ini sekali di komponen App / root layout kamu.
export default function useNotifications() {
  useEffect(() => {
    let unsubscribe;

    async function setup() {
      if (!("Notification" in window) || !("serviceWorker" in navigator)) {
        console.warn("Browser tidak mendukung notifikasi web.");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        console.warn("Izin notifikasi ditolak user.");
        return;
      }

      try {
        const registration = await navigator.serviceWorker.register(
          "/firebase-messaging-sw.js"
        );

        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: registration,
        });

        if (!token) {
          console.warn("Gagal mendapatkan FCM token.");
          return;
        }

        // Daftarkan token ke topic "enclosure-alerts" lewat backend.
        // Setelah ini Firebase yang urus keanggotaan topic, tidak perlu simpan token sendiri.
        await fetch("/api/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
      } catch (err) {
        console.error("Gagal setup push notification:", err);
      }
    }

    setup();

    // Ini menangani notifikasi yang masuk SAAT tab sedang dibuka (foreground).
    // onBackgroundMessage di service worker menangani saat tab tertutup/background.
    unsubscribe = onMessage(messaging, (payload) => {
      const title = (payload.notification && payload.notification.title) || "Notifikasi";
      const body = (payload.notification && payload.notification.body) || "";
      new Notification(title, { body });
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);
}

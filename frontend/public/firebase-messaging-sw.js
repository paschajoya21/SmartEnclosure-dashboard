/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

// Service worker tidak bisa baca process.env, jadi config ditulis manual di sini.
// Nilainya sama persis dengan yang ada di frontend/.env (REACT_APP_FIREBASE_*).
// Ini AMAN untuk ditulis langsung - Firebase web config memang publik by design,
// keamanan diatur lewat Firebase Security Rules, bukan lewat kerahasiaan config ini.
firebase.initializeApp({
  apiKey: "AIzaSyAdTjBslHfGCzvg9Cb0MvKX_xoEG4mQ5BE",
  authDomain: "smart-enclosure-reptile.firebaseapp.com",
  projectId: "smart-enclosure-reptile",
  storageBucket: "smart-enclosure-reptile.firebasestorage.app",
  messagingSenderId: "498971397296",
  appId: "1:498971397296:web:5818f776819e3b83433f75"
});

const messaging = firebase.messaging();

// Ini yang jalan kalau notifikasi masuk saat tab web SEDANG TERTUTUP / di background.
messaging.onBackgroundMessage((payload) => {
  const title = (payload.notification && payload.notification.title) || "Smart Enclosure Alert";
  const body = (payload.notification && payload.notification.body) || "";

  self.registration.showNotification(title, {
    body,
    icon: "/logo192.png",
  });
});

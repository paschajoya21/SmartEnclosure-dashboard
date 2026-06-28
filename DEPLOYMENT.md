# Deployment Notes

## GitHub repository
Repository target: https://github.com/paschajoya21/SmartEnclosure.git

Project yang di-push cukup folder ini: `WebSmartEnclosure`.
Folder ESP/Arduino tidak perlu masuk repo web.

## Vercel frontend
Deploy frontend React dari folder `frontend`.

Recommended Vercel settings:
- Framework Preset: Create React App
- Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `build`

Environment variable frontend:
```
REACT_APP_BACKEND_URL=https://URL-BACKEND-KAMU
```

## Backend note
Backend tidak ideal dijalankan di Vercel karena butuh:
- koneksi MQTT persistent
- Socket.IO websocket
- scheduler deteksi berkala
- upload gambar dari ESP32-S3

Jalankan backend di layanan yang mendukung long-running Node.js process seperti Render, Railway, VPS, atau laptop/Raspberry Pi lokal.

Environment variable backend lihat `backend/.env.example`.

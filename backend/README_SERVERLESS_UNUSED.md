# Legacy Backend

Folder backend Express ini tidak dipakai untuk arsitektur serverless Vercel.

Mode serverless sekarang memakai:

- Frontend React di folder `frontend`
- MQTT WebSocket langsung dari browser ke HiveMQ
- Vercel Function `frontend/api/detect.js` untuk Roboflow
- ESP32 sebagai scheduler deteksi dan auto-control aktuator

Folder ini boleh disimpan sebagai referensi lokal, tetapi jangan dipakai sebagai backend production jika targetnya hanya Vercel tanpa server tambahan.

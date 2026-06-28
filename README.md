# Smart Reptile Enclosure Dashboard

Dashboard IoT serverless untuk memantau sensor, mengontrol aktuator, dan menjalankan deteksi spesies reptil menggunakan ESP32-S3, MQTT WebSocket, Vercel Function, dan Roboflow.

## Arsitektur Serverless

```text
Frontend React di Vercel
  <-> MQTT over WebSocket
HiveMQ Broker
  <-> MQTT TCP
ESP32-S3
  -> HTTPS POST image
Vercel Function /api/detect
  -> Roboflow Workflow
  -> publish hasil deteksi + preview ke MQTT
```

Backend Express lama tidak diperlukan untuk mode deployment ini. ESP32 menjadi pusat scheduler dan auto-control, sehingga deteksi otomatis tetap berjalan walaupun dashboard web tidak sedang dibuka.

## Komponen

| Komponen | Teknologi |
|----------|-----------|
| Frontend | React 18 |
| Hosting | Vercel |
| Realtime | MQTT over WebSocket |
| Broker | HiveMQ Public Broker |
| Deteksi | Vercel Function + Roboflow |
| Scheduler | ESP32-S3 + NTP |
| Auto-control | ESP32-S3 |

## Struktur Penting

```text
WebSmartEnclosure/
  frontend/
    api/
      detect.js          # Vercel Function untuk Roboflow
      health.js          # Health check serverless
      speciesCatalog.js  # Daftar spesies + parameter
    src/
      hooks/useSocket.js # MQTT WebSocket hook
      components/        # Dashboard UI
    vercel.json
  backend/               # Legacy, tidak dipakai untuk serverless production
```

## MQTT Topics

| Topic | Arah | Fungsi |
|-------|------|--------|
| `smart-enclosure-reptil/device01/sensor` | ESP -> Web | Data sensor dan status aktuator |
| `smart-enclosure-reptil/device01/status` | ESP -> Web | Status perangkat |
| `smart-enclosure-reptil/device01/control` | Web -> ESP | Command aktuator dan deteksi |
| `smart-enclosure-reptil/device01/detection` | ESP/Function -> Web | Status dan hasil deteksi |

## Command Kontrol

| Command | Fungsi |
|---------|--------|
| `relay1_on` / `relay1_off` | Heatpad ON/OFF |
| `relay2_on` / `relay2_off` | Lampu ON/OFF |
| `humidifier_on` / `humidifier_off` | Humidifier ON/OFF |
| `all_off` | Matikan semua aktuator dan reset parameter aktif |
| `read_sensor` | Minta ESP publish data sensor |
| `detect_species` | Jalankan deteksi manual |

## Deteksi Otomatis

Deteksi berkala berjalan di ESP32-S3 pada jam 06:00, 12:00, 18:00, dan 22:00 WIB. Sebelum mengambil gambar, ESP menyalakan lampu relay2, menunggu beberapa detik, mengambil gambar, lalu upload JPEG ke Vercel Function `/api/detect`.

Jika hasil Roboflow valid dan confidence minimal 60%, ESP menyimpan parameter:

- warm side min/max
- humidity min/max

ESP lalu menjalankan heatpad, lampu, dan humidifier otomatis berdasarkan data sensor. Jika spesies unknown, confidence rendah, atau deteksi error, aktuator dimatikan.

## Menjalankan Frontend Lokal

```bash
cd frontend
npm install
npm start
```

## Environment Variable Vercel

Isi di dashboard Vercel pada project frontend:

```env
ROBOFLOW_API_KEY=your_roboflow_api_key
ROBOFLOW_WORKFLOW_URL=https://serverless.roboflow.com/reptileclassification/workflows/detect-and-classify
DETECTION_CONFIDENCE_THRESHOLD=60
MQTT_URL=wss://broker.hivemq.com:8884/mqtt
MQTT_BASE_TOPIC=smart-enclosure-reptil/device01
REACT_APP_MQTT_URL=wss://broker.hivemq.com:8884/mqtt
REACT_APP_MQTT_BASE_TOPIC=smart-enclosure-reptil/device01
```

## Konfigurasi ESP32

Setelah frontend deploy ke Vercel, ubah domain di `programESP/programESP.ino`:

```cpp
const char* detection_host = "domain-vercel-kamu.vercel.app";
```

Jangan isi dengan `https://`; cukup hostname saja.

## Deployment

Lihat [DEPLOYMENT.md](./DEPLOYMENT.md).

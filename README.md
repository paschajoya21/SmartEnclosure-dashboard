# 🦎 Smart Reptile Enclosure Dashboard

Dashboard IoT full-stack untuk memantau dan mengontrol kandang reptil secara real-time menggunakan MQTT, Socket.IO, React, dan Node.js.

---

## Arsitektur Sistem

```
ESP32 ──MQTT──► HiveMQ Broker ──MQTT──► Backend (Node.js)
                                              │
                                          Socket.IO
                                              │
                                         Frontend (React)
```

| Komponen | Teknologi |
|----------|-----------|
| Frontend | React 18 |
| Backend | Node.js + Express |
| Real-time | Socket.IO |
| MQTT | mqtt.js → HiveMQ Public Broker |
| MQTT Broker | broker.hivemq.com:1883 |

---

## Struktur Folder

```
WebSmartEnclosure/
├── backend/
│   ├── src/
│   │   ├── index.js          # Entry point: Express + Socket.IO + MQTT init
│   │   ├── config.js         # Konfigurasi broker, port, allowed commands
│   │   ├── mqttClient.js     # MQTT connection, subscribe, publish
│   │   └── routes/
│   │       └── control.js    # POST /api/control endpoint
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── index.js          # React entry point
│   │   ├── index.css         # Global styles & CSS variables
│   │   ├── App.jsx           # Root component & layout
│   │   ├── App.module.css
│   │   ├── hooks/
│   │   │   └── useSocket.js  # Socket.IO hook (sensor data, logs, status)
│   │   ├── api/
│   │   │   └── control.js    # HTTP API helper untuk kirim command
│   │   └── components/
│   │       ├── Header.jsx        # Header + status badge koneksi
│   │       ├── SensorCard.jsx    # Card temperature, humidity, lux
│   │       ├── ActuatorCard.jsx  # Card status relay & humidifier
│   │       ├── ControlPanel.jsx  # Tombol kontrol aktuator
│   │       └── LogPanel.jsx      # Panel log pesan MQTT
│   ├── package.json
│   └── .env.example
│
└── README.md
```

---

## MQTT Topics

| Arah | Topic | Deskripsi |
|------|-------|-----------|
| Subscribe | `smart-enclosure-reptil/device01/sensor` | Data sensor dari ESP32 |
| Subscribe | `smart-enclosure-reptil/device01/status` | Status perangkat dari ESP32 |
| Publish | `smart-enclosure-reptil/device01/control` | Command kontrol ke ESP32 |

### Format Payload Sensor (dari ESP32)
```json
{
  "temperature": 28.5,
  "humidity": 75.0,
  "lux": 120.0,
  "relay1": "off",
  "relay2": "off",
  "humidifier": "off"
}
```

### Daftar Command Kontrol
| Command | Fungsi |
|---------|--------|
| `relay1_on` | Hidupkan Relay 1 |
| `relay1_off` | Matikan Relay 1 |
| `relay2_on` | Hidupkan Relay 2 |
| `relay2_off` | Matikan Relay 2 |
| `humidifier_on` | Hidupkan Humidifier |
| `humidifier_off` | Matikan Humidifier |
| `all_off` | Matikan semua aktuator |
| `read_sensor` | Minta ESP32 kirim data sensor |

---

## Cara Menjalankan

### Prasyarat
- Node.js v18+ sudah terinstall
- npm atau yarn tersedia
- Koneksi internet untuk MQTT broker publik HiveMQ

---

### 1. Jalankan Backend

```bash
# Masuk ke folder backend
cd backend

# Install dependencies
npm install

# (Opsional) Salin file env
copy .env.example .env

# Jalankan server
npm start
```

Server backend akan berjalan di `http://localhost:3001`

Untuk development dengan auto-reload:
```bash
npm run dev
```

---

### 2. Jalankan Frontend

Buka terminal baru:

```bash
# Masuk ke folder frontend
cd frontend

# Install dependencies
npm install

# (Opsional) Salin file env
copy .env.example .env

# Jalankan development server
npm start
```

Frontend akan terbuka otomatis di browser pada `http://localhost:3000`

---

## API Endpoint

### POST `/api/control`

Kirim command ke ESP32 melalui MQTT.

**Request Body:**
```json
{
  "command": "relay1_on"
}
```

**Response Sukses (200):**
```json
{
  "success": true,
  "message": "Command \"relay1_on\" has been sent successfully.",
  "command": "relay1_on"
}
```

**Response Error (400 - Command tidak valid):**
```json
{
  "success": false,
  "error": "Unknown command \"xyz\". Allowed commands: relay1_on, relay1_off, ..."
}
```

**Response Error (503 - MQTT tidak terhubung):**
```json
{
  "success": false,
  "error": "MQTT broker is not connected. Please wait and try again."
}
```

### GET `/api/health`
```json
{ "status": "ok", "timestamp": "2024-01-01T00:00:00.000Z" }
```

---

## Socket.IO Events (Backend → Frontend)

| Event | Payload | Deskripsi |
|-------|---------|-----------|
| `sensor-data` | `{ temperature, humidity, lux, relay1, relay2, humidifier, timestamp }` | Data sensor terbaru |
| `device-status` | `{ message, timestamp }` | Status device dari topic status |
| `mqtt-status` | `{ status: "connected"\|"disconnected", timestamp }` | Perubahan status koneksi MQTT |
| `log` | `{ message, timestamp }` | Log aktivitas MQTT |

---

## Fitur Dashboard

- **Sensor Card** — Menampilkan temperature (°C), humidity (%), lux (lx) secara real-time
- **Actuator Card** — Status visual relay1, relay2, humidifier (ON/OFF dengan warna)
- **Control Panel** — Tombol Relay 1 ON/OFF, Relay 2 ON/OFF, Humidifier ON/OFF, All OFF, Read Sensor
- **MQTT Status** — Indikator koneksi MQTT (hijau/merah) dan Socket.IO di header
- **Log Panel** — Riwayat 50 pesan MQTT terbaru dengan timestamp
- **Responsive** — Tampilan optimal di desktop dan tablet

---

## Troubleshooting

**Backend tidak terhubung ke MQTT broker:**
- Pastikan koneksi internet aktif
- Cek apakah `broker.hivemq.com:1883` dapat diakses dari jaringan Anda
- Periksa log console backend untuk pesan error

**Frontend tidak menerima data:**
- Pastikan backend berjalan di port 3001
- Cek CORS jika frontend dan backend berjalan di domain berbeda
- Verifikasi URL backend di `frontend/.env` atau `REACT_APP_BACKEND_URL`

**Tombol kontrol tidak berfungsi:**
- Pastikan indikator MQTT berwarna hijau (Connected)
- Cek log panel untuk pesan error dari backend


## Deployment

Lihat [DEPLOYMENT.md](./DEPLOYMENT.md) untuk panduan GitHub, Vercel frontend, dan hosting backend.

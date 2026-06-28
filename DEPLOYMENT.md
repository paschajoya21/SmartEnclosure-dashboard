# Deployment Serverless

Repository target: https://github.com/paschajoya21/SmartEnclosure.git

Deploy hanya folder `WebSmartEnclosure/frontend` ke Vercel. Folder `backend` adalah legacy dan tidak diperlukan untuk production serverless.

## Vercel Settings

- Framework Preset: Create React App
- Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `build`

## Environment Variables

Isi di Vercel Project Settings:

```env
ROBOFLOW_API_KEY=your_roboflow_api_key
ROBOFLOW_WORKFLOW_URL=https://serverless.roboflow.com/reptileclassification/workflows/detect-and-classify
DETECTION_CONFIDENCE_THRESHOLD=60
MQTT_URL=wss://mqtt.eclipseprojects.io/mqtt
MQTT_BASE_TOPIC=smart-enclosure-reptil/device01
REACT_APP_MQTT_URL=wss://mqtt.eclipseprojects.io/mqtt
REACT_APP_MQTT_BASE_TOPIC=smart-enclosure-reptil/device01
```

## Setelah Deploy

1. Salin domain Vercel, misalnya `smart-enclosure.vercel.app`.
2. Buka `programESP/programESP.ino`.
3. Ubah:

```cpp
const char* detection_host = "smart-enclosure.vercel.app";
```

4. Upload ulang sketch ke ESP32-S3.
5. Buka dashboard Vercel dan pastikan MQTT WebSocket berstatus connected.
6. Tekan `Run Detection` atau tunggu scheduler ESP pada jam 06:00, 12:00, 18:00, dan 22:00 WIB.

## Catatan

Vercel Function hanya aktif ketika ESP mengirim gambar ke `/api/detect`. Tidak ada server backend yang harus menyala terus, sehingga masalah sleep backend tidak lagi mengganggu MQTT, kontrol aktuator, atau scheduler deteksi.

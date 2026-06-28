/**
 * Application configuration
 */
const config = {
  server: {
    port: process.env.PORT || 3001,
    publicUrl: process.env.PUBLIC_BACKEND_URL || '',
  },
  mqtt: {
    // WSS lebih stabil saat laptop memakai hotspot seluler yang sering memblokir/reset port MQTT 1883.
    url: process.env.MQTT_URL || 'wss://broker.hivemq.com:8884/mqtt',
    host: 'broker.hivemq.com',
    port: 1883,
    clientId: `smart-enclosure-backend-${Math.random().toString(16).slice(2, 8)}`,
    topics: {
      sensor: 'smart-enclosure-reptil/device01/sensor',
      status: 'smart-enclosure-reptil/device01/status',
      control: 'smart-enclosure-reptil/device01/control',
      detection: 'smart-enclosure-reptil/device01/detection',
    },
    reconnectPeriod: 5000,
    connectTimeout: 30000,
  },
  roboflow: {
    workflowUrl: process.env.ROBOFLOW_WORKFLOW_URL || 'https://serverless.roboflow.com/reptileclassification/workflows/detect-and-classify',
    apiKey: process.env.ROBOFLOW_API_KEY || '',
    confidenceThreshold: Number(process.env.DETECTION_CONFIDENCE_THRESHOLD || 60),
    imageInputType: process.env.ROBOFLOW_IMAGE_INPUT_TYPE || 'base64',
    timeoutMs: Number(process.env.ROBOFLOW_TIMEOUT_MS || 45000),
  },
  autoControl: {
    enabled: process.env.AUTO_CONTROL_ENABLED !== 'false',
  },
  detectionSchedule: {
    enabled: process.env.DETECTION_SCHEDULE_ENABLED !== 'false',
    timezone: process.env.DETECTION_SCHEDULE_TIMEZONE || 'Asia/Jakarta',
    times: (process.env.DETECTION_SCHEDULE_TIMES || '06:00,12:00,18:00,22:00')
      .split(',')
      .map((time) => time.trim())
      .filter(Boolean),
    preLightMs: Number(process.env.DETECTION_PRE_LIGHT_MS || 5000),
  },
  allowedCommands: [
    'relay1_on',
    'relay1_off',
    'relay2_on',
    'relay2_off',
    'humidifier_on',
    'humidifier_off',
    'all_off',
    'read_sensor',
    'detect_species',
  ],
};

module.exports = config;

import { useEffect, useRef, useState, useCallback } from 'react';
import mqtt from 'mqtt';

const MQTT_URL = process.env.REACT_APP_MQTT_URL || 'wss://broker.hivemq.com:8884/mqtt';
const BASE_TOPIC = process.env.REACT_APP_MQTT_BASE_TOPIC || 'smart-enclosure-reptil/device01';
const MAX_LOGS = 50;

const TOPICS = {
  status: BASE_TOPIC + '/status',
  sensor: BASE_TOPIC + '/sensor',
  control: BASE_TOPIC + '/control',
  detection: BASE_TOPIC + '/detection',
};

function parseJsonPayload(payload) {
  try {
    return JSON.parse(payload);
  } catch (_err) {
    return null;
  }
}

export function useSocket() {
  const mqttRef = useRef(null);
  const [sensorData, setSensorData] = useState(null);
  const [deviceStatus, setDeviceStatus] = useState(null);
  const [mqttStatus, setMqttStatus] = useState('unknown');
  const [socketConnected, setSocketConnected] = useState(false);
  const [logs, setLogs] = useState([]);
  const [detectionResult, setDetectionResult] = useState(null);

  const addLog = useCallback((message, timestamp) => {
    const entry = {
      id: Date.now() + Math.random(),
      message,
      timestamp: timestamp || new Date().toISOString(),
    };

    setLogs((prev) => [entry, ...prev].slice(0, MAX_LOGS));
  }, []);

  const sendCommand = useCallback((command) => new Promise((resolve, reject) => {
    const client = mqttRef.current;

    if (!client || !client.connected) {
      reject(new Error('MQTT is not connected.'));
      return;
    }

    client.publish(TOPICS.control, command, { qos: 0, retain: false }, (err) => {
      if (err) {
        reject(err);
        return;
      }

      resolve({ success: true, message: 'Command "' + command + '" has been sent.', command });
    });
  }), []);

  useEffect(() => {
    const clientId = 'web-smart-enclosure-' + Math.random().toString(16).slice(2);
    const client = mqtt.connect(MQTT_URL, {
      clientId,
      clean: true,
      reconnectPeriod: 3000,
      connectTimeout: 30000,
    });

    mqttRef.current = client;

    client.on('connect', () => {
      setMqttStatus('connected');
      setSocketConnected(true);
      addLog('MQTT WebSocket connected');
      client.subscribe([TOPICS.sensor, TOPICS.status, TOPICS.detection], (err) => {
        if (err) {
          addLog('MQTT subscribe failed: ' + err.message);
        } else {
          addLog('Subscribed to device topics');
        }
      });
    });

    client.on('reconnect', () => {
      setMqttStatus('reconnecting');
    });

    client.on('close', () => {
      setMqttStatus('disconnected');
      setSocketConnected(false);
    });

    client.on('offline', () => {
      setMqttStatus('disconnected');
      setSocketConnected(false);
      addLog('MQTT WebSocket offline');
    });

    client.on('error', (err) => {
      setMqttStatus('disconnected');
      addLog('MQTT error: ' + err.message);
    });

    client.on('message', (topic, buffer) => {
      const payload = buffer.toString();
      const data = parseJsonPayload(payload);

      if (topic === TOPICS.sensor && data) {
        setSensorData({ ...data, timestamp: data.timestamp || new Date().toISOString() });
        return;
      }

      if (topic === TOPICS.status) {
        if (data) {
          setSensorData((prev) => ({ ...(prev || {}), ...data, timestamp: data.timestamp || new Date().toISOString() }));
          setDeviceStatus({ status: 'online', message: 'Device status updated', timestamp: new Date().toISOString() });
        } else {
          setDeviceStatus({ status: 'online', message: payload, timestamp: new Date().toISOString() });
        }
        addLog('[Device] ' + payload);
        return;
      }

      if (topic === TOPICS.detection) {
        if (data) {
          setDetectionResult({ ...data, timestamp: data.timestamp || new Date().toISOString() });
          addLog('[Detection] ' + (data.message || data.status || 'updated'), data.timestamp);
        } else {
          addLog('[Detection] ' + payload);
        }
        return;
      }

      addLog('MQTT ' + topic + ': ' + payload);
    });

    return () => {
      client.end(true);
    };
  }, [addLog]);

  return {
    sensorData,
    deviceStatus,
    mqttStatus,
    socketConnected,
    logs,
    detectionResult,
    addLog,
    sendCommand,
  };
}

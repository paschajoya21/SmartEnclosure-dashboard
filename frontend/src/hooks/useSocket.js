import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
const MAX_LOGS = 50;

/**
 * Custom hook to manage Socket.IO connection and real-time data
 */
export function useSocket() {
  const socketRef = useRef(null);
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
    setLogs((prev) => {
      const updated = [entry, ...prev];
      return updated.slice(0, MAX_LOGS);
    });
  }, []);

  useEffect(() => {
    const socket = io(BACKEND_URL, {
      reconnectionDelay: 3000,
      reconnectionAttempts: Infinity,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
      addLog('Connected to backend server');
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
      addLog('Disconnected from backend server');
    });

    socket.on('sensor-data', (data) => {
      setSensorData(data);
    });

    socket.on('device-status', (data) => {
      setDeviceStatus(data);
      addLog(`[Device Status] ${data.message}`, data.timestamp);
    });

    socket.on('mqtt-status', (data) => {
      setMqttStatus(data.status);
      addLog(`MQTT status: ${data.status}`, data.timestamp);
    });

    socket.on('log', (data) => {
      addLog(data.message, data.timestamp);
    });

    socket.on('detection-result', (data) => {
      setDetectionResult(data);
      addLog(`[Detection] ${data.message || data.status || 'updated'}`, data.timestamp);
    });

    return () => {
      socket.disconnect();
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
  };
}

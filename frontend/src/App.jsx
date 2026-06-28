import React from 'react';
import { useSocket } from './hooks/useSocket';
import Header from './components/Header';
import SensorCard from './components/SensorCard';
import ControlPanel from './components/ControlPanel';
import DetectionCard from './components/DetectionCard';
import LogPanel from './components/LogPanel';
import styles from './App.module.css';

export default function App() {
  const {
    sensorData,
    mqttStatus,
    socketConnected,
    logs,
    detectionResult,
    addLog,
    sendCommand,
  } = useSocket();

  const handleCommandSent = (message) => {
    if (message.startsWith('[ERROR]')) {
      addLog(message);
    } else {
      addLog('[Control] Command sent: ' + message);
    }
  };

  return (
    <div className={styles.app}>
      <Header mqttStatus={mqttStatus} socketConnected={socketConnected} />

      <main className={styles.main}>
        <div className={styles.leftCol}>
          <SensorCard
            sensorData={sensorData}
            lastUpdate={sensorData?.timestamp}
          />
          <DetectionCard
            mqttStatus={mqttStatus}
            detectionResult={detectionResult}
            onSendCommand={sendCommand}
            onCommandSent={handleCommandSent}
          />
        </div>

        <div className={styles.rightCol}>
          <ControlPanel
            mqttStatus={mqttStatus}
            sensorData={sensorData}
            onSendCommand={sendCommand}
            onCommandSent={handleCommandSent}
          />
          <LogPanel logs={logs} />
        </div>
      </main>

      <footer className={styles.footer}>
        <span>Smart Reptile Enclosure Dashboard</span>
        <span className={styles.footerSep}>-</span>
        <span>MQTT WebSocket: mqtt.eclipseprojects.io</span>
        <span className={styles.footerSep}>-</span>
        <span>Topic: smart-enclosure-reptil/device01</span>
      </footer>
    </div>
  );
}

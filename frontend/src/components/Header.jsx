import React from 'react';
import styles from './Header.module.css';

export default function Header({ mqttStatus, socketConnected }) {
  const mqttConnected = mqttStatus === 'connected';

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <span className={styles.icon} role="img" aria-label="reptile">🦎</span>
        <div>
          <h1 className={styles.title}>Smart Reptile Enclosure Dashboard</h1>
          <p className={styles.subtitle}>Serverless IoT Monitoring & Control</p>
        </div>
      </div>

      <div className={styles.statusGroup}>
        <div className={styles.statusBadge}>
          <span className={styles.dot + ' ' + (socketConnected ? styles.dotGreen : styles.dotRed)} />
          <span className={styles.statusLabel}>
            MQTT WebSocket: {socketConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        <div className={styles.statusBadge}>
          <span className={styles.dot + ' ' + (mqttConnected ? styles.dotGreen : mqttStatus === 'unknown' || mqttStatus === 'reconnecting' ? styles.dotYellow : styles.dotRed)} />
          <span className={styles.statusLabel}>
            Status: {mqttStatus === 'connected' ? 'Ready' : mqttStatus === 'reconnecting' ? 'Reconnecting' : mqttStatus === 'disconnected' ? 'Disconnected' : 'Starting'}
          </span>
        </div>
      </div>
    </header>
  );
}

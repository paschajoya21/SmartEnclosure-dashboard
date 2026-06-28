import React from 'react';
import styles from './Header.module.css';

export default function Header({ mqttStatus, socketConnected }) {
  const mqttConnected = mqttStatus === 'connected';

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        {/* Reptile icon */}
        <span className={styles.icon} role="img" aria-label="reptile">🦎</span>
        <div>
          <h1 className={styles.title}>Smart Reptile Enclosure Dashboard</h1>
          <p className={styles.subtitle}>IoT Monitoring & Control Dashboard</p>
        </div>
      </div>

      <div className={styles.statusGroup}>
        {/* Socket.IO status */}
        <div className={styles.statusBadge}>
          <span
            className={`${styles.dot} ${socketConnected ? styles.dotGreen : styles.dotRed}`}
          />
          <span className={styles.statusLabel}>
            {socketConnected ? 'Server Connected' : 'Server Disconnected'}
          </span>
        </div>

        {/* MQTT status */}
        <div className={styles.statusBadge}>
          <span
            className={`${styles.dot} ${mqttConnected ? styles.dotGreen : mqttStatus === 'unknown' ? styles.dotYellow : styles.dotRed}`}
          />
          <span className={styles.statusLabel}>
            MQTT:{' '}
            {mqttStatus === 'connected'
              ? 'Connected'
              : mqttStatus === 'disconnected'
              ? 'Disconnected'
              : 'Unknown'}
          </span>
        </div>
      </div>
    </header>
  );
}

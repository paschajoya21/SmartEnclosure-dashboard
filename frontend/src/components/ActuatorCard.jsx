import React from 'react';
import styles from './ActuatorCard.module.css';

const ACTUATOR_CONFIG = {
  relay1: { label: 'Relay 1', icon: '⚡', description: 'Power Relay 1' },
  relay2: { label: 'Relay 2', icon: '⚡', description: 'Power Relay 2' },
  humidifier: { label: 'Humidifier', icon: '💨', description: 'Humidity Control' },
};

function StatusIndicator({ actuator, status }) {
  const cfg = ACTUATOR_CONFIG[actuator] ?? { label: actuator, icon: '❓', description: '' };
  const isOn = status === 'on';
  // Unknown = null, undefined, empty string, or any value that is not 'on' or 'off'
  const isUnknown = status !== 'on' && status !== 'off';

  return (
    <div className={`${styles.actuatorItem} ${isOn ? styles.isOn : ''}`}>
      <div className={styles.actuatorLeft}>
        <span className={styles.actuatorIcon}>{cfg.icon}</span>
        <div>
          <p className={styles.actuatorLabel}>{cfg.label}</p>
          <p className={styles.actuatorDesc}>{cfg.description}</p>
        </div>
      </div>
      <div className={`${styles.badge} ${isUnknown ? styles.badgeUnknown : isOn ? styles.badgeOn : styles.badgeOff}`}>
        <span className={styles.badgeDot} />
        {isUnknown ? 'Unknown' : isOn ? 'ON' : 'OFF'}
      </div>
    </div>
  );
}

export default function ActuatorCard({ sensorData }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>🔌 Actuator Status</h2>
      </div>

      <div className={styles.actuatorList}>
        {['relay1', 'relay2', 'humidifier'].map((key) => (
          <StatusIndicator
            key={key}
            actuator={key}
            status={sensorData ? sensorData[key] : null}
          />
        ))}
      </div>
    </div>
  );
}

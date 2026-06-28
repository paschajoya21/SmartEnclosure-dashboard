import React from 'react';
import styles from './SensorCard.module.css';

const SENSOR_CONFIG = {
  temperature: { label: 'Temperature', unit: '°C', icon: '🌡️', color: '#ff7c43' },
  humidity: { label: 'Humidity', unit: '%', icon: '💧', color: '#4ecca3' },
  lux: { label: 'Light Intensity', unit: 'lx', icon: '☀️', color: '#f6c90e' },
};

function SingleSensor({ type, value }) {
  const cfg = SENSOR_CONFIG[type];
  const displayValue = value !== null && value !== undefined ? Number(value).toFixed(1) : '--';

  return (
    <div className={styles.sensorItem} style={{ '--accent': cfg.color }}>
      <div className={styles.sensorIcon}>{cfg.icon}</div>
      <div className={styles.sensorBody}>
        <p className={styles.sensorLabel}>{cfg.label}</p>
        <p className={styles.sensorValue}>
          <span className={styles.valueNumber}>{displayValue}</span>
          <span className={styles.valueUnit}>{cfg.unit}</span>
        </p>
      </div>
    </div>
  );
}

export default function SensorCard({ sensorData, lastUpdate }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>📊 Sensor Readings</h2>
        {lastUpdate && (
          <span className={styles.lastUpdate}>
            Updated: {new Date(lastUpdate).toLocaleTimeString()}
          </span>
        )}
      </div>

      <div className={styles.sensorGrid}>
        {['temperature', 'humidity', 'lux'].map((type) => (
          <SingleSensor
            key={type}
            type={type}
            value={sensorData ? sensorData[type] : null}
          />
        ))}
      </div>
    </div>
  );
}

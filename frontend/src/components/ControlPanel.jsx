import React, { useState } from 'react';
import { sendCommand } from '../api/control';
import styles from './ControlPanel.module.css';

const ACTUATORS = [
  { key: 'relay1', label: 'Heatpad', description: 'Pemanas alas', onCommand: 'relay1_on', offCommand: 'relay1_off' },
  { key: 'relay2', label: 'Lampu', description: 'Lampu pemanas warm side', onCommand: 'relay2_on', offCommand: 'relay2_off' },
  { key: 'humidifier', label: 'Humidifier', description: 'Kontrol kelembapan', onCommand: 'humidifier_on', offCommand: 'humidifier_off' },
];

function ActuatorSwitch({ actuator, status, loadingCommand, mqttReady, onToggle }) {
  const isOn = status === 'on';
  const isUnknown = status !== 'on' && status !== 'off';
  const nextCommand = isOn ? actuator.offCommand : actuator.onCommand;
  const loading = loadingCommand === actuator.onCommand || loadingCommand === actuator.offCommand;
  const rowClass = [styles.actuatorRow, isOn ? styles.rowOn : ''].filter(Boolean).join(' ');
  const dotClass = [styles.statusDot, isUnknown ? styles.dotUnknown : isOn ? styles.dotOn : styles.dotOff].join(' ');
  const switchClass = [styles.switch, isOn ? styles.switchOn : ''].filter(Boolean).join(' ');

  return (
    <div className={rowClass}>
      <div className={styles.actuatorInfo}>
        <span className={dotClass} />
        <div>
          <p className={styles.actuatorLabel}>{actuator.label}</p>
          <p className={styles.actuatorDesc}>{actuator.description}</p>
        </div>
      </div>

      <button
        type="button"
        className={switchClass}
        onClick={() => onToggle(nextCommand)}
        disabled={!mqttReady || loadingCommand !== null}
        aria-pressed={isOn}
        aria-label={actuator.label + ' ' + (isOn ? 'OFF' : 'ON')}
      >
        <span className={styles.switchTrack}>
          <span className={styles.switchThumb}>{loading ? <span className={styles.spinner} /> : null}</span>
        </span>
        <span className={styles.switchText}>{isUnknown ? 'UNK' : isOn ? 'ON' : 'OFF'}</span>
      </button>
    </div>
  );
}

export default function ControlPanel({ mqttStatus, sensorData, onCommandSent }) {
  const [loadingCommand, setLoadingCommand] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const mqttReady = mqttStatus === 'connected';

  const handleCommand = async (command) => {
    if (loadingCommand) return;
    setLoadingCommand(command);
    setFeedback(null);

    try {
      const result = await sendCommand(command);
      setFeedback({ type: 'success', message: result.message });
      if (onCommandSent) onCommandSent(command);
    } catch (err) {
      const errorMsg = err.message || 'Failed to send command';
      setFeedback({ type: 'error', message: errorMsg });
      if (onCommandSent) onCommandSent('[ERROR] ' + command + ': ' + errorMsg);
    } finally {
      setLoadingCommand(null);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>Actuator Status & Control</h2>
        {!mqttReady && <span className={styles.mqttWarning}>MQTT not connected</span>}
      </div>

      <div className={styles.actuatorList}>
        {ACTUATORS.map((actuator) => (
          <ActuatorSwitch
            key={actuator.key}
            actuator={actuator}
            status={sensorData ? sensorData[actuator.key] : null}
            loadingCommand={loadingCommand}
            mqttReady={mqttReady}
            onToggle={handleCommand}
          />
        ))}
      </div>

      <div className={styles.utilityRow}>
        <button type="button" className={[styles.utilityButton, styles.dangerButton].join(' ')} onClick={() => handleCommand('all_off')} disabled={!mqttReady || loadingCommand !== null}>All OFF</button>
        <button type="button" className={styles.utilityButton} onClick={() => handleCommand('read_sensor')} disabled={!mqttReady || loadingCommand !== null}>Read Sensor</button>
      </div>

      {feedback && (
        <div className={[styles.feedback, feedback.type === 'error' ? styles.feedbackError : styles.feedbackSuccess].join(' ')}>
          {feedback.message}
        </div>
      )}
    </section>
  );
}

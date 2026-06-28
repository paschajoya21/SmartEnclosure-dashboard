import React, { useState } from 'react';
import styles from './DetectionCard.module.css';

function formatTime(iso) {
  if (!iso) return '-';

  try {
    return new Date(iso).toLocaleTimeString();
  } catch (_err) {
    return '-';
  }
}

function getStatusLabel(result) {
  if (!result) return 'Idle';
  if (result.status === 'processing') return 'Processing';
  if (result.status === 'received') return 'Image received';
  if (result.status === 'classified') return 'Classified';
  if (result.status === 'unknown') return 'Unknown';
  if (result.status === 'failed') return 'Failed';
  if (result.status === 'error') return 'Error';
  return result.status || 'Updated';
}

function formatConfidence(value) {
  if (typeof value !== 'number') return '-';
  return value + '%';
}

export default function DetectionCard({ mqttStatus, detectionResult, onSendCommand, onCommandSent }) {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const mqttReady = mqttStatus === 'connected';
  const canRun = mqttReady && !loading;
  const statusLabel = loading ? 'Sending command' : getStatusLabel(detectionResult);
  const isFailure = detectionResult?.status === 'failed' || detectionResult?.status === 'error' || detectionResult?.status === 'unknown';
  const preview = detectionResult?.previewBase64 || detectionResult?.imagePreview;

  const handleDetect = async () => {
    if (!canRun || !onSendCommand) return;

    setLoading(true);
    setFeedback(null);

    try {
      const result = await onSendCommand('detect_species');
      setFeedback({ type: 'success', message: result.message || 'Detection command sent.' });
      if (onCommandSent) onCommandSent('detect_species');
    } catch (err) {
      const message = err.message || 'Failed to send detection command.';
      setFeedback({ type: 'error', message });
      if (onCommandSent) onCommandSent('[ERROR] detect_species: ' + message);
    } finally {
      setLoading(false);
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Species Detection</h2>
          <p className={styles.subtitle}>ESP32-S3 camera to Roboflow</p>
        </div>
        <span className={styles.status + ' ' + (isFailure ? styles.statusError : styles.statusNormal)}>
          {statusLabel}
        </span>
      </div>

      <button
        type="button"
        className={styles.detectButton}
        onClick={handleDetect}
        disabled={!canRun}
        aria-label="Run species detection"
      >
        {loading ? <span className={styles.spinner} /> : <span className={styles.buttonIcon}>+</span>}
        Run Detection
      </button>

      {!mqttReady && (
        <div className={styles.notice}>MQTT not connected</div>
      )}

      {feedback && (
        <div className={styles.feedback + ' ' + (feedback.type === 'error' ? styles.feedbackError : styles.feedbackSuccess)}>
          {feedback.message}
        </div>
      )}

      <div className={styles.previewWrap}>
        <span className={styles.label}>Last Captured Image</span>
        {preview ? (
          <img className={styles.previewImage} src={preview} alt="Last captured reptile detection" />
        ) : (
          <div className={styles.previewEmpty}>Waiting for captured image</div>
        )}
      </div>

      <div className={styles.resultGrid}>
        <div className={styles.resultItem}>
          <span className={styles.label}>Species</span>
          <strong>{detectionResult?.species || '-'}</strong>
        </div>
        <div className={styles.resultItem}>
          <span className={styles.label}>Confidence</span>
          <strong>{formatConfidence(detectionResult?.confidence)}</strong>
        </div>
        <div className={styles.resultItem}>
          <span className={styles.label}>Warm Side</span>
          <strong>{detectionResult?.conditions?.warmSide || '-'}</strong>
        </div>
        <div className={styles.resultItem}>
          <span className={styles.label}>Cool Side</span>
          <strong>{detectionResult?.conditions?.coolSide || '-'}</strong>
        </div>
        <div className={styles.resultItemWide}>
          <span className={styles.label}>Humidity</span>
          <strong>{detectionResult?.conditions?.humidity || '-'}</strong>
        </div>
        <div className={styles.resultItemWide}>
          <span className={styles.label}>Message</span>
          <strong>{detectionResult?.notification || detectionResult?.message || '-'}</strong>
        </div>
        <div className={styles.resultItemWide}>
          <span className={styles.label}>Last update</span>
          <strong>{formatTime(detectionResult?.timestamp)}</strong>
        </div>
      </div>
    </section>
  );
}

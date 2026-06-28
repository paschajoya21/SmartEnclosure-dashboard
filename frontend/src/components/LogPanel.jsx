import React, { useEffect, useRef } from 'react';
import styles from './LogPanel.module.css';

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString();
  } catch {
    return iso;
  }
}

export default function LogPanel({ logs = [] }) {
  const listRef = useRef(null);

  // Auto-scroll to top when new log arrives (newest is at top)
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [logs.length]);

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>📋 MQTT Log</h2>
        <span className={styles.logCount}>{logs.length} entries</span>
      </div>

      <div className={styles.logList} ref={listRef}>
        {logs.length === 0 ? (
          <p className={styles.empty}>No log messages yet. Waiting for MQTT activity...</p>
        ) : (
          logs.map((entry) => (
            <div key={entry.id} className={styles.logEntry}>
              <span className={styles.logTime}>{formatTime(entry.timestamp)}</span>
              <span className={styles.logMessage}>{entry.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

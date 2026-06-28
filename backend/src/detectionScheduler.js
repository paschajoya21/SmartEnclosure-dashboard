const config = require('./config');
const { publishCommand, getMqttStatus } = require('./mqttClient');

function getDateParts(timezone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());

  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function startDetectionScheduler() {
  if (!config.detectionSchedule.enabled) {
    console.log('[Scheduler] Detection schedule disabled');
    return null;
  }

  const timezone = config.detectionSchedule.timezone;
  const times = new Set(config.detectionSchedule.times);
  let lastRunKey = null;

  console.log('[Scheduler] Detection schedule enabled:', Array.from(times).join(', '), timezone);

  const timer = setInterval(() => {
    const parts = getDateParts(timezone);
    const currentTime = parts.hour + ':' + parts.minute;
    const runKey = parts.year + '-' + parts.month + '-' + parts.day + ' ' + currentTime;

    if (!times.has(currentTime) || lastRunKey === runKey) return;

    lastRunKey = runKey;

    if (!getMqttStatus()) {
      console.warn('[Scheduler] Skip detection, MQTT not connected:', runKey);
      return;
    }

    console.log('[Scheduler] Starting scheduled detection:', runKey);
    publishCommand('relay2_on');

    setTimeout(() => {
      if (!getMqttStatus()) {
        console.warn('[Scheduler] Skip detect_species, MQTT disconnected');
        return;
      }

      publishCommand('detect_species');
    }, config.detectionSchedule.preLightMs);
  }, 30000);

  return timer;
}

module.exports = { startDetectionScheduler };

const mqtt = require('mqtt');
const config = require('./config');

let client = null;
let isConnected = false;
let ioInstance = null;
let activeDetection = null;
let latestActuatorState = { relay1: 'unknown', relay2: 'unknown', humidifier: 'unknown' };

function initMqtt(io) {
  ioInstance = io;

  const brokerUrl = config.mqtt.url || ('mqtt://' + config.mqtt.host + ':' + config.mqtt.port);

  console.log('[MQTT] Connecting to ' + brokerUrl + ' ...');

  client = mqtt.connect(brokerUrl, {
    clientId: config.mqtt.clientId,
    reconnectPeriod: config.mqtt.reconnectPeriod,
    connectTimeout: config.mqtt.connectTimeout,
    clean: true,
  });

  client.on('connect', () => {
    isConnected = true;
    console.log('[MQTT] Connected to broker');

    const topics = [config.mqtt.topics.sensor, config.mqtt.topics.status, config.mqtt.topics.detection];

    client.subscribe(topics, { qos: 0 }, (err) => {
      if (err) console.error('[MQTT] Subscription error:', err.message);
      else console.log('[MQTT] Subscribed to topics:', topics.join(', '));
    });

    broadcastMqttStatus('connected');
    broadcastLog('MQTT broker connected');
  });

  client.on('message', (topic, message) => {
    const raw = message.toString();
    console.log('[MQTT] Message received on ' + topic + ': ' + raw);
    broadcastLog('[' + topic + '] ' + raw);

    if (topic === config.mqtt.topics.sensor) handleSensorMessage(raw);
    else if (topic === config.mqtt.topics.status) handleStatusMessage(raw);
    else if (topic === config.mqtt.topics.detection) handleDetectionMessage(raw);
  });

  client.on('reconnect', () => {
    console.log('[MQTT] Reconnecting...');
    broadcastLog('MQTT reconnecting...');
  });

  client.on('offline', () => {
    isConnected = false;
    console.warn('[MQTT] Client offline');
    broadcastMqttStatus('disconnected');
    broadcastLog('MQTT broker disconnected');
  });

  client.on('disconnect', () => {
    isConnected = false;
    console.warn('[MQTT] Disconnected from broker');
    broadcastMqttStatus('disconnected');
  });

  client.on('error', (err) => {
    console.error('[MQTT] Error:', err.message);
    broadcastLog('MQTT error: ' + err.message);
  });
}

function parseRange(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value)
    .replace(/,/g, '.')
    .replace(/[–—]/g, '-')
    .replace(/±/g, '')
    .replace(/[^0-9.\-]+/g, ' ')
    .trim();
  const numbers = normalized.split(/[\s-]+/).map(Number).filter(Number.isFinite);
  if (numbers.length === 0) return null;
  if (numbers.length === 1) return { min: numbers[0], max: numbers[0] };
  return { min: Math.min(numbers[0], numbers[1]), max: Math.max(numbers[0], numbers[1]) };
}

function rememberActuatorState(data) {
  latestActuatorState = {
    relay1: data.relay1 ?? latestActuatorState.relay1,
    relay2: data.relay2 ?? latestActuatorState.relay2,
    humidifier: data.humidifier ?? latestActuatorState.humidifier,
  };
}

function publishAutoCommand(command, reason) {
  const result = publishCommand(command);
  if (result.success) {
    const message = '[Auto Control] ' + command + ': ' + reason;
    console.log(message);
    broadcastLog(message);
  }
  return result;
}

function emitAutoControl(data) {
  if (ioInstance) ioInstance.emit('auto-control', { ...data, timestamp: new Date().toISOString() });
}

function runAutoControl(sensorData) {
  if (!config.autoControl.enabled || !activeDetection?.conditions) return;

  const temperature = Number(sensorData.temperature);
  const humidity = Number(sensorData.humidity);
  const warmRange = parseRange(activeDetection.conditions.warmSide);
  const humidityRange = parseRange(activeDetection.conditions.humidity);
  const actions = [];

  if (Number.isFinite(temperature) && warmRange) {
    if (temperature < warmRange.min) {
      if (latestActuatorState.relay1 !== 'on') {
        publishAutoCommand('relay1_on', 'temperature ' + temperature + ' below warm side ' + activeDetection.conditions.warmSide + ' heatpad on');
        latestActuatorState.relay1 = 'on';
        actions.push('relay1_on');
      }
      if (latestActuatorState.relay2 !== 'on') {
        publishAutoCommand('relay2_on', 'temperature ' + temperature + ' below warm side ' + activeDetection.conditions.warmSide + ' lamp on');
        latestActuatorState.relay2 = 'on';
        actions.push('relay2_on');
      }
    } else if (temperature > warmRange.max) {
      if (latestActuatorState.relay1 !== 'off') {
        publishAutoCommand('relay1_off', 'temperature ' + temperature + ' above warm side ' + activeDetection.conditions.warmSide + ' heatpad off');
        latestActuatorState.relay1 = 'off';
        actions.push('relay1_off');
      }
      if (latestActuatorState.relay2 !== 'off') {
        publishAutoCommand('relay2_off', 'temperature ' + temperature + ' above warm side ' + activeDetection.conditions.warmSide + ' lamp off');
        latestActuatorState.relay2 = 'off';
        actions.push('relay2_off');
      }
    }
  }

  if (Number.isFinite(humidity) && humidityRange) {
    if (humidity < humidityRange.min && latestActuatorState.humidifier !== 'on') {
      publishAutoCommand('humidifier_on', 'humidity ' + humidity + ' below target ' + activeDetection.conditions.humidity);
      latestActuatorState.humidifier = 'on';
      actions.push('humidifier_on');
    } else if (humidity > humidityRange.max && latestActuatorState.humidifier !== 'off') {
      publishAutoCommand('humidifier_off', 'humidity ' + humidity + ' above target ' + activeDetection.conditions.humidity);
      latestActuatorState.humidifier = 'off';
      actions.push('humidifier_off');
    }
  }

  emitAutoControl({
    species: activeDetection.species,
    conditions: activeDetection.conditions,
    sensor: {
      temperature: Number.isFinite(temperature) ? temperature : null,
      humidity: Number.isFinite(humidity) ? humidity : null,
    },
    actuatorState: latestActuatorState,
    actions,
  });
}

function handleSensorMessage(raw) {
  try {
    const data = JSON.parse(raw);
    const requiredFields = ['temperature', 'humidity', 'lux', 'relay1', 'relay2', 'humidifier'];
    const missingFields = requiredFields.filter((field) => data[field] === undefined);
    if (missingFields.length > 0) console.warn('[MQTT] Sensor payload missing fields:', missingFields.join(', '));

    rememberActuatorState(data);
    runAutoControl(data);

    if (ioInstance) {
      ioInstance.emit('sensor-data', {
        temperature: data.temperature ?? null,
        humidity: data.humidity ?? null,
        lux: data.lux ?? null,
        relay1: data.relay1 ?? 'unknown',
        relay2: data.relay2 ?? 'unknown',
        humidifier: data.humidifier ?? 'unknown',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error('[MQTT] Failed to parse sensor payload:', err.message);
  }
}

function handleStatusMessage(raw) {
  if (ioInstance) ioInstance.emit('device-status', { message: raw, timestamp: new Date().toISOString() });
}

function updateActiveDetection(payload) {
  if (payload.status === 'classified' && payload.conditions) {
    activeDetection = {
      species: payload.species,
      scientificName: payload.scientificName,
      confidence: payload.confidence,
      conditions: payload.conditions,
      timestamp: payload.timestamp || new Date().toISOString(),
    };
    broadcastLog('[Auto Control] Active species: ' + payload.species);
    return;
  }

  if (payload.status === 'unknown' || payload.status === 'error' || payload.actuatorCommand === 'all_off') {
    activeDetection = null;
    publishAutoCommand('all_off', payload.notification || payload.message || 'detection not accepted');
  }
}

function handleDetectionMessage(raw) {
  let payload;
  try { payload = JSON.parse(raw); } catch (_err) { payload = { status: 'message', message: raw }; }
  updateActiveDetection(payload);
  if (ioInstance) ioInstance.emit('detection-result', { ...payload, raw, timestamp: payload.timestamp || new Date().toISOString() });
}

function publishCommand(command) {
  if (!client || !isConnected) return { success: false, error: 'MQTT not connected' };
  try {
    client.publish(config.mqtt.topics.control, command, { qos: 0 }, (err) => {
      if (err) console.error('[MQTT] Publish error:', err.message);
      else {
        console.log('[MQTT] Command published: ' + command);
        broadcastLog('Command sent: ' + command);
      }
    });
    return { success: true };
  } catch (err) {
    console.error('[MQTT] Publish exception:', err.message);
    return { success: false, error: err.message };
  }
}

function broadcastMqttStatus(status) {
  if (ioInstance) ioInstance.emit('mqtt-status', { status, timestamp: new Date().toISOString() });
}

function broadcastLog(message) {
  if (ioInstance) ioInstance.emit('log', { message, timestamp: new Date().toISOString() });
}

function getMqttStatus() { return isConnected; }

function getAutoControlState() {
  return { activeDetection, latestActuatorState, enabled: config.autoControl.enabled };
}

function _resetForTest(mockClient, connected) {
  client = mockClient;
  isConnected = connected;
  activeDetection = null;
  latestActuatorState = { relay1: 'unknown', relay2: 'unknown', humidifier: 'unknown' };
}

module.exports = {
  initMqtt,
  publishCommand,
  getMqttStatus,
  getAutoControlState,
  handleSensorMessage,
  handleDetectionMessage,
  _resetForTest,
};

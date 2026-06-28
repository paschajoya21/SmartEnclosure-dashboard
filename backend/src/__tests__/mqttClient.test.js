// Feature: smart-reptile-enclosure-dashboard, Property 3: sensor payload round-trip mempertahankan nilai

/**
 * Property 3: Sensor payload round-trip mempertahankan nilai
 * Validates: Requirements 2.1, 2.2
 *
 * For any valid sensor JSON payload received on the MQTT sensor topic,
 * after being parsed and broadcast by the backend as a 'sensor-data' event,
 * the values of temperature, humidity, and lux SHALL equal the original payload values.
 * Actuator values SHALL be normalized to 'on', 'off', or 'unknown' — never undefined.
 */

const fc = require('fast-check');

// Mock the mqtt module so initMqtt() never opens a real network connection.
// All tests in this file work by calling handleSensorMessage / publishCommand
// directly — no actual broker connection is needed.
jest.mock('mqtt', () => ({
  connect: jest.fn(() => ({
    on: jest.fn(),
    subscribe: jest.fn(),
    publish: jest.fn(),
    end: jest.fn(),
  })),
}));

const { initMqtt, handleSensorMessage } = require('../mqttClient');

describe('mqttClient - Property 3: Sensor payload round-trip mempertahankan nilai', () => {
  let mockIo;
  let emittedEvent;
  let emittedData;

  beforeAll(() => {
    mockIo = {
      emit: jest.fn((event, data) => {
        emittedEvent = event;
        emittedData = data;
      }),
    };
    initMqtt(mockIo);
  });

  beforeEach(() => {
    mockIo.emit.mockClear();
    emittedEvent = null;
    emittedData = null;
  });

  test('Property 3: temperature, humidity, dan lux dipertahankan; aktuator tidak pernah undefined', () => {
    // Validates: Requirements 2.1, 2.2
    fc.assert(
      fc.property(
        fc.record({
          temperature: fc.float({ noNaN: true, noDefaultInfinity: true }),
          humidity: fc.float({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true }),
          lux: fc.float({ min: 0, noNaN: true, noDefaultInfinity: true }),
          relay1: fc.constantFrom('on', 'off'),
          relay2: fc.constantFrom('on', 'off'),
          humidifier: fc.constantFrom('on', 'off'),
        }),
        (payload) => {
          // Reset captured data
          emittedEvent = null;
          emittedData = null;

          // Simulate receiving the MQTT sensor message
          handleSensorMessage(JSON.stringify(payload));

          // The handler must have emitted a 'sensor-data' event
          if (emittedEvent !== 'sensor-data') return false;
          if (!emittedData) return false;

          // Temperature, humidity, lux must be preserved exactly
          const tempMatch = emittedData.temperature === payload.temperature;
          const humidityMatch = emittedData.humidity === payload.humidity;
          const luxMatch = emittedData.lux === payload.lux;

          // Actuator values must never be undefined
          const relay1Valid = emittedData.relay1 !== undefined;
          const relay2Valid = emittedData.relay2 !== undefined;
          const humidifierValid = emittedData.humidifier !== undefined;

          // Actuator values must be 'on', 'off', or 'unknown'
          const validActuatorValues = ['on', 'off', 'unknown'];
          const relay1Normalized = validActuatorValues.includes(emittedData.relay1);
          const relay2Normalized = validActuatorValues.includes(emittedData.relay2);
          const humidifierNormalized = validActuatorValues.includes(emittedData.humidifier);

          // Timestamp must be present and a valid ISO string
          const hasTimestamp = typeof emittedData.timestamp === 'string' && emittedData.timestamp.length > 0;

          return (
            tempMatch &&
            humidityMatch &&
            luxMatch &&
            relay1Valid &&
            relay2Valid &&
            humidifierValid &&
            relay1Normalized &&
            relay2Normalized &&
            humidifierNormalized &&
            hasTimestamp
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  test('handleSensorMessage: payload JSON tidak valid tidak melempar error dan tidak emit', () => {
    handleSensorMessage('bukan-json-valid');
    expect(mockIo.emit).not.toHaveBeenCalledWith('sensor-data', expect.anything());
  });

  test('handleSensorMessage: field yang hilang di-fallback ke null/unknown', () => {
    // Payload tanpa field apapun
    handleSensorMessage(JSON.stringify({}));

    const sensorDataCall = mockIo.emit.mock.calls.find(([event]) => event === 'sensor-data');
    expect(sensorDataCall).toBeDefined();

    const emitted = sensorDataCall[1];
    expect(emitted.temperature).toBeNull();
    expect(emitted.humidity).toBeNull();
    expect(emitted.lux).toBeNull();
    expect(emitted.relay1).toBe('unknown');
    expect(emitted.relay2).toBe('unknown');
    expect(emitted.humidifier).toBe('unknown');
  });
});

// Feature: smart-reptile-enclosure-dashboard, Property 5: command tidak dimodifikasi

/**
 * Property 5: Command string valid melewati validasi tanpa modifikasi
 * Validates: Requirements 3.2
 *
 * For any command string that belongs to allowedCommands, after processing
 * (trim whitespace), the value published to the MQTT control topic SHALL be
 * exactly equal to the command string from allowedCommands (exact match,
 * case-sensitive).
 */

describe('mqttClient - Property 5: Command string valid melewati validasi tanpa modifikasi', () => {
  const config = require('../config');
  const { publishCommand, _resetForTest } = require('../mqttClient');

  let mockPublish;

  beforeEach(() => {
    mockPublish = jest.fn();
    // Inject a mock MQTT client that captures publish calls
    _resetForTest({ publish: mockPublish }, true);
  });

  test('Property 5: publishCommand mengirim command string tanpa modifikasi ke control topic', () => {
    // Validates: Requirements 3.2
    fc.assert(
      fc.property(
        fc.constantFrom(...config.allowedCommands),
        (cmd) => {
          mockPublish.mockClear();

          publishCommand(cmd);

          // publish must have been called exactly once
          if (mockPublish.mock.calls.length !== 1) return false;

          const [topic, message] = mockPublish.mock.calls[0];

          // Topic must be the control topic
          if (topic !== config.mqtt.topics.control) return false;

          // Message (second arg) must be the exact unmodified command string
          return message === cmd;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Unit tests for mqttClient.js (Task 13.3) ────────────────────────────────

/**
 * Unit Tests: mqttClient.js
 * Validates: Requirements 2.1, 2.2, 2.3, 3.2
 */

describe('mqttClient - Unit Tests', () => {
  let mockIo;
  const { initMqtt, _resetForTest } = require('../mqttClient');

  beforeEach(() => {
    mockIo = { emit: jest.fn() };
    // Re-init with fresh mockIo so handleSensorMessage uses the correct ioInstance
    initMqtt(mockIo);
    mockIo.emit.mockClear();
  });

  // ── handleSensorMessage ────────────────────────────────────────────────────

  describe('handleSensorMessage', () => {
    test('payload valid → emit sensor-data dengan data yang benar', () => {
      // Validates: Requirements 2.1, 2.2
      const { handleSensorMessage } = require('../mqttClient');
      const payload = {
        temperature: 28.5,
        humidity: 65.0,
        lux: 1200,
        relay1: 'on',
        relay2: 'off',
        humidifier: 'on',
      };

      handleSensorMessage(JSON.stringify(payload));

      const sensorDataCall = mockIo.emit.mock.calls.find(([event]) => event === 'sensor-data');
      expect(sensorDataCall).toBeDefined();

      const emitted = sensorDataCall[1];
      expect(emitted.temperature).toBe(28.5);
      expect(emitted.humidity).toBe(65.0);
      expect(emitted.lux).toBe(1200);
      expect(emitted.relay1).toBe('on');
      expect(emitted.relay2).toBe('off');
      expect(emitted.humidifier).toBe('on');
      expect(typeof emitted.timestamp).toBe('string');
      expect(emitted.timestamp.length).toBeGreaterThan(0);
    });

    test('JSON tidak valid → tidak emit sensor-data dan tidak throw', () => {
      // Validates: Requirements 2.3
      const { handleSensorMessage } = require('../mqttClient');

      expect(() => {
        handleSensorMessage('{not valid json!!!}');
      }).not.toThrow();

      expect(mockIo.emit).not.toHaveBeenCalledWith('sensor-data', expect.anything());
    });

    test('field hilang → emit sensor-data dengan null/unknown sebagai fallback', () => {
      // Validates: Requirements 2.2
      const { handleSensorMessage } = require('../mqttClient');

      handleSensorMessage(JSON.stringify({}));

      const sensorDataCall = mockIo.emit.mock.calls.find(([event]) => event === 'sensor-data');
      expect(sensorDataCall).toBeDefined();

      const emitted = sensorDataCall[1];
      expect(emitted.temperature).toBeNull();
      expect(emitted.humidity).toBeNull();
      expect(emitted.lux).toBeNull();
      expect(emitted.relay1).toBe('unknown');
      expect(emitted.relay2).toBe('unknown');
      expect(emitted.humidifier).toBe('unknown');
    });
  });

  // ── publishCommand ─────────────────────────────────────────────────────────

  describe('publishCommand', () => {
    test('saat tidak connected → mengembalikan { success: false, error: ... }', () => {
      // Validates: Requirements 3.2
      const { publishCommand, _resetForTest } = require('../mqttClient');

      // Simulate disconnected state: no client, not connected
      _resetForTest(null, false);

      const result = publishCommand('relay1_on');

      expect(result.success).toBe(false);
      expect(typeof result.error).toBe('string');
      expect(result.error.length).toBeGreaterThan(0);
    });

    test('saat connected → mengembalikan { success: true }', () => {
      // Validates: Requirements 3.2
      const { publishCommand, _resetForTest } = require('../mqttClient');
      const mockPublish = jest.fn();

      _resetForTest({ publish: mockPublish }, true);

      const result = publishCommand('relay1_on');

      expect(result.success).toBe(true);
      expect(mockPublish).toHaveBeenCalledTimes(1);
    });
  });
});

// ── MQTT event-callback coverage tests ────────────────────────────────────────

/**
 * These tests cover the MQTT event callbacks registered inside initMqtt():
 * 'connect', 'message', 'reconnect', 'offline', 'disconnect', 'error'
 * as well as handleStatusMessage.
 *
 * Strategy: replace the top-level mqtt.connect mock with a version whose
 * returned fake client stores callbacks in a map, then fire them manually.
 */

describe('mqttClient - MQTT event callbacks (initMqtt coverage)', () => {
  let mockIo;
  let fakeClient;
  let callbacks; // { eventName: fn }

  const mqttModule = require('mqtt');
  const config = require('../config');

  beforeEach(() => {
    // Build a fake MQTT client that captures event listeners
    callbacks = {};
    fakeClient = {
      on: jest.fn((event, cb) => { callbacks[event] = cb; }),
      subscribe: jest.fn((topics, opts, cb) => { if (cb) cb(null); }),
      publish: jest.fn(),
      end: jest.fn(),
    };

    // Override the mock so connect() returns our controllable fakeClient
    mqttModule.connect.mockReturnValue(fakeClient);

    mockIo = { emit: jest.fn() };

    // Re-require a fresh module so initMqtt runs against fakeClient.
    // Jest caches modules, so we need jest.resetModules() + re-require.
    jest.resetModules();

    // Re-mock mqtt AFTER resetting modules so the fresh require picks it up
    jest.mock('mqtt', () => {
      const fakeCallbacks = {};
      const client = {
        on: jest.fn((event, cb) => { fakeCallbacks[event] = cb; }),
        subscribe: jest.fn((topics, opts, cb) => { if (cb) cb(null); }),
        publish: jest.fn(),
        end: jest.fn(),
        _callbacks: fakeCallbacks,
      };
      return { connect: jest.fn(() => client), _latestClient: client };
    });

    const freshMqtt = require('mqtt');
    const freshMqttClient = require('../mqttClient');
    freshMqttClient.initMqtt(mockIo);

    // Grab the fake client's callbacks registry for use in tests
    fakeClient = freshMqtt._latestClient;
    callbacks = freshMqtt._latestClient._callbacks;
  });

  test('connect event: isConnected becomes true, subscribes, broadcasts mqtt-status + log', () => {
    const freshMqttClient = require('../mqttClient');

    // Fire the 'connect' callback
    expect(callbacks['connect']).toBeDefined();
    callbacks['connect']();

    // getMqttStatus should now return true
    expect(freshMqttClient.getMqttStatus()).toBe(true);

    // fakeClient.subscribe should have been called
    expect(fakeClient.subscribe).toHaveBeenCalled();

    // Socket.IO should have emitted 'mqtt-status' with status:'connected' and 'log'
    const mqttStatusCall = mockIo.emit.mock.calls.find(([ev]) => ev === 'mqtt-status');
    expect(mqttStatusCall).toBeDefined();
    expect(mqttStatusCall[1].status).toBe('connected');

    const logCall = mockIo.emit.mock.calls.find(([ev]) => ev === 'log');
    expect(logCall).toBeDefined();
  });

  test('connect event: subscribe error is logged without throwing', () => {
    // Override subscribe to call cb with an error
    fakeClient.subscribe = jest.fn((topics, opts, cb) => {
      if (cb) cb(new Error('subscribe failed'));
    });

    expect(() => callbacks['connect']()).not.toThrow();
  });

  test('message event on sensor topic → handleSensorMessage path', () => {
    // First connect so ioInstance is set
    callbacks['connect']();
    mockIo.emit.mockClear();

    const payload = JSON.stringify({
      temperature: 30, humidity: 70, lux: 500,
      relay1: 'on', relay2: 'off', humidifier: 'on',
    });

    expect(callbacks['message']).toBeDefined();
    callbacks['message'](config.mqtt.topics.sensor, Buffer.from(payload));

    // Should have emitted 'sensor-data'
    const sensorCall = mockIo.emit.mock.calls.find(([ev]) => ev === 'sensor-data');
    expect(sensorCall).toBeDefined();
    expect(sensorCall[1].temperature).toBe(30);

    // Should have emitted a 'log' for the raw message
    const logCall = mockIo.emit.mock.calls.find(([ev]) => ev === 'log');
    expect(logCall).toBeDefined();
  });

  test('message event on status topic → handleStatusMessage path', () => {
    callbacks['connect']();
    mockIo.emit.mockClear();

    callbacks['message'](config.mqtt.topics.status, Buffer.from('online'));

    const deviceStatusCall = mockIo.emit.mock.calls.find(([ev]) => ev === 'device-status');
    expect(deviceStatusCall).toBeDefined();
    expect(deviceStatusCall[1].message).toBe('online');
    expect(typeof deviceStatusCall[1].timestamp).toBe('string');
  });

  test('reconnect event: broadcasts log message', () => {
    expect(callbacks['reconnect']).toBeDefined();
    callbacks['reconnect']();

    const logCall = mockIo.emit.mock.calls.find(([ev]) => ev === 'log');
    expect(logCall).toBeDefined();
    expect(logCall[1].message).toMatch(/reconnect/i);
  });

  test('offline event: isConnected becomes false, broadcasts mqtt-status:disconnected + log', () => {
    const freshMqttClient = require('../mqttClient');

    // Connect first so isConnected=true
    callbacks['connect']();
    expect(freshMqttClient.getMqttStatus()).toBe(true);
    mockIo.emit.mockClear();

    expect(callbacks['offline']).toBeDefined();
    callbacks['offline']();

    expect(freshMqttClient.getMqttStatus()).toBe(false);

    const mqttStatusCall = mockIo.emit.mock.calls.find(([ev]) => ev === 'mqtt-status');
    expect(mqttStatusCall).toBeDefined();
    expect(mqttStatusCall[1].status).toBe('disconnected');

    const logCall = mockIo.emit.mock.calls.find(([ev]) => ev === 'log');
    expect(logCall).toBeDefined();
  });

  test('disconnect event: isConnected becomes false, broadcasts mqtt-status:disconnected', () => {
    const freshMqttClient = require('../mqttClient');

    callbacks['connect']();
    expect(freshMqttClient.getMqttStatus()).toBe(true);
    mockIo.emit.mockClear();

    expect(callbacks['disconnect']).toBeDefined();
    callbacks['disconnect']();

    expect(freshMqttClient.getMqttStatus()).toBe(false);

    const mqttStatusCall = mockIo.emit.mock.calls.find(([ev]) => ev === 'mqtt-status');
    expect(mqttStatusCall).toBeDefined();
    expect(mqttStatusCall[1].status).toBe('disconnected');
  });

  test('error event: broadcasts log with error message', () => {
    expect(callbacks['error']).toBeDefined();
    callbacks['error'](new Error('connection refused'));

    const logCall = mockIo.emit.mock.calls.find(([ev]) => ev === 'log');
    expect(logCall).toBeDefined();
    expect(logCall[1].message).toMatch(/connection refused/i);
  });

  test('publishCommand: publish callback logs error without throwing', () => {
    const freshMqttClient = require('../mqttClient');

    // Connect so isConnected=true and fakeClient is set internally
    callbacks['connect']();

    // Override fakeClient.publish to simulate an error in the callback
    fakeClient.publish = jest.fn((topic, msg, opts, cb) => {
      if (cb) cb(new Error('publish failed'));
    });

    // Use _resetForTest to inject our modified fakeClient
    freshMqttClient._resetForTest(fakeClient, true);

    expect(() => freshMqttClient.publishCommand('relay1_on')).not.toThrow();
  });

  test('publishCommand: publish callback with no error logs success', () => {
    const freshMqttClient = require('../mqttClient');

    callbacks['connect']();

    fakeClient.publish = jest.fn((topic, msg, opts, cb) => {
      if (cb) cb(null);
    });

    freshMqttClient._resetForTest(fakeClient, true);
    mockIo.emit.mockClear();

    const result = freshMqttClient.publishCommand('relay1_on');
    expect(result.success).toBe(true);

    // The publish success callback calls broadcastLog
    const logCall = mockIo.emit.mock.calls.find(([ev]) => ev === 'log');
    expect(logCall).toBeDefined();
    expect(logCall[1].message).toMatch(/relay1_on/);
  });

  test('publishCommand: client.publish throws synchronously → returns { success: false, error }', () => {
    // Covers lines 148-149 (catch block in publishCommand)
    const freshMqttClient = require('../mqttClient');

    const throwingClient = {
      publish: jest.fn(() => { throw new Error('sync publish exception'); }),
    };
    freshMqttClient._resetForTest(throwingClient, true);

    const result = freshMqttClient.publishCommand('relay1_on');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/sync publish exception/);
  });
});

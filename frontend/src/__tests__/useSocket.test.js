// Feature: smart-reptile-enclosure-dashboard, Property 4: log tidak melebihi 50 entri
// Validates: Requirements 8.3

import * as fc from 'fast-check';

/**
 * MAX_LOGS constant — mirrors the value in useSocket.js
 */
const MAX_LOGS = 50;

/**
 * Pure function extracted from the addLog / log reducer logic in useSocket.js.
 *
 * Mirrors the exact behaviour of the setLogs functional updater inside addLog:
 *
 *   setLogs((prev) => {
 *     const updated = [entry, ...prev];
 *     return updated.slice(0, MAX_LOGS);
 *   });
 *
 * @param {Array<{id: number, message: string, timestamp: string}>} prev - current log state
 * @param {string} message - new log message to prepend
 * @returns {Array<{id: number, message: string, timestamp: string}>} next log state
 */
export function applyAddLog(prev, message) {
  const entry = {
    id: Date.now() + Math.random(),
    message,
    timestamp: new Date().toISOString(),
  };
  const updated = [entry, ...prev];
  return updated.slice(0, MAX_LOGS);
}

/**
 * Helper: apply a sequence of messages to an initial (empty) log state.
 *
 * @param {string[]} messages
 * @returns {Array} final log state after all messages have been applied
 */
function applyAllLogs(messages) {
  return messages.reduce((logs, msg) => applyAddLog(logs, msg), []);
}

// ---------------------------------------------------------------------------
// Property 4: Log panel tidak pernah melebihi 50 entri
// ---------------------------------------------------------------------------

describe('useSocket – Property 4: log tidak melebihi 50 entri', () => {
  /**
   * Property test: for any sequence of up to 200 log messages,
   * the resulting log array length SHALL always be <= 50.
   */
  test('log entries never exceed 50 for any sequence of messages', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string(), { minLength: 0, maxLength: 200 }),
        (messages) => {
          const result = applyAllLogs(messages);
          return result.length <= MAX_LOGS;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property test: when more than 50 messages are added, the oldest entries
   * (i.e. entries added earliest) SHALL be discarded — only the most recent
   * MAX_LOGS entries are retained.
   *
   * Because applyAddLog prepends (newest first), "oldest" means the highest
   * index in the resulting array. We verify this by checking that the retained
   * entries correspond to the LAST MAX_LOGS messages from the input sequence
   * (the most-recently-added ones).
   */
  test('oldest entries are discarded when cap is exceeded', () => {
    fc.assert(
      fc.property(
        // Generate sequences strictly longer than MAX_LOGS to force truncation
        fc.array(fc.string(), { minLength: MAX_LOGS + 1, maxLength: 200 }),
        (messages) => {
          const result = applyAllLogs(messages);

          // Result length must be exactly MAX_LOGS
          if (result.length !== MAX_LOGS) return false;

          // The most recently added messages are the LAST `MAX_LOGS` items of
          // the input array (they were prepended in order, so the last message
          // added ends up at index 0).
          const expectedMessages = messages.slice(-MAX_LOGS).reverse();

          // Verify each retained entry's message matches the expected message
          return result.every(
            (entry, idx) => entry.message === expectedMessages[idx]
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  // ---------------------------------------------------------------------------
  // Concrete / unit examples as sanity checks
  // ---------------------------------------------------------------------------

  test('empty message sequence produces empty log', () => {
    const result = applyAllLogs([]);
    expect(result).toHaveLength(0);
  });

  test('fewer than 50 messages — all are retained', () => {
    const messages = Array.from({ length: 30 }, (_, i) => `msg-${i}`);
    const result = applyAllLogs(messages);
    expect(result.length).toBe(30);
  });

  test('exactly 50 messages — all are retained', () => {
    const messages = Array.from({ length: 50 }, (_, i) => `msg-${i}`);
    const result = applyAllLogs(messages);
    expect(result.length).toBe(50);
  });

  test('51 messages — log is capped at 50, oldest entry discarded', () => {
    const messages = Array.from({ length: 51 }, (_, i) => `msg-${i}`);
    const result = applyAllLogs(messages);

    expect(result.length).toBe(50);

    // The first message added ("msg-0") should have been discarded
    const retainedMessages = result.map((e) => e.message);
    expect(retainedMessages).not.toContain('msg-0');

    // The most recently added message ("msg-50") should be at index 0 (newest first)
    expect(result[0].message).toBe('msg-50');
  });

  test('200 messages — log is capped at 50, newest 50 retained', () => {
    const messages = Array.from({ length: 200 }, (_, i) => `msg-${i}`);
    const result = applyAllLogs(messages);

    expect(result.length).toBe(50);

    // Newest 50: msg-150 … msg-199 (msg-199 is at index 0)
    expect(result[0].message).toBe('msg-199');
    expect(result[49].message).toBe('msg-150');
  });

  test('applyAddLog prepends — newest entry is at index 0', () => {
    const logs1 = applyAddLog([], 'first');
    const logs2 = applyAddLog(logs1, 'second');

    expect(logs2[0].message).toBe('second');
    expect(logs2[1].message).toBe('first');
  });
});

// =============================================================================
// Unit tests for useSocket hook – Task 15.2
// Validates: Requirements 10.3, 10.5, 8.3
// =============================================================================

import { renderHook, act } from '@testing-library/react';
import { useSocket } from '../hooks/useSocket';

// Tell Jest to use the manual mock at <rootDir>/__mocks__/socket.io-client.js.
// This is required for node_modules mocks even when the __mocks__ folder is
// adjacent to node_modules (CRA does NOT auto-mock node_modules).
jest.mock('socket.io-client');

// Import the mock helpers AFTER jest.mock() so we get the mocked module.
// CRA's babel transform converts `import { io } from 'socket.io-client'` to
// `const { io } = require('socket.io-client')`, so the named export works.
const { io: mockIo, mockSocket } = require('socket.io-client');

/**
 * Unit tests for the useSocket custom hook.
 *
 * These tests use the Jest manual mock for socket.io-client (at
 * <rootDir>/__mocks__/socket.io-client.js) so that Socket.IO events can be
 * triggered synchronously via mockSocket.mockEmit().
 *
 * CRA sets `resetMocks: true` in its Jest config, which resets mock
 * implementations between tests. We restore the io() implementation in
 * beforeEach so the hook always receives a valid mock socket.
 */
describe('useSocket – unit tests (Task 15.2)', () => {
  beforeEach(() => {
    // CRA sets resetMocks: true — re-apply all mock implementations cleared between tests.
    // mockSocket.on must be restored so event handlers are captured into eventHandlers.
    mockIo.mockImplementation(() => mockSocket);
    mockSocket.on.mockImplementation((event, handler) => {
      // Store handlers so mockEmit can fire them
      mockSocket._handlers = mockSocket._handlers || {};
      mockSocket._handlers[event] = handler;
    });
    // Clear any leftover handlers from prior test
    mockSocket._handlers = {};
  });

  // -------------------------------------------------------------------------
  // Log behaviour – Requirements 8.3, 10.3
  // -------------------------------------------------------------------------

  test('addLog prepends entries — newest log is at index 0 (newest first)', () => {
    const { result } = renderHook(() => useSocket());

    act(() => {
      result.current.addLog('first message');
    });
    act(() => {
      result.current.addLog('second message');
    });

    // Newest entry should be at index 0
    expect(result.current.logs[0].message).toBe('second message');
    expect(result.current.logs[1].message).toBe('first message');
  });

  test('logs are capped at 50 after 51 addLog calls', () => {
    const { result } = renderHook(() => useSocket());

    act(() => {
      for (let i = 1; i <= 51; i++) {
        result.current.addLog(`message ${i}`);
      }
    });

    expect(result.current.logs.length).toBe(50);
    // Newest message ('message 51') must be at index 0
    expect(result.current.logs[0].message).toBe('message 51');
    // Oldest message ('message 1') must be discarded
    const messages = result.current.logs.map((e) => e.message);
    expect(messages).not.toContain('message 1');
  });

  // -------------------------------------------------------------------------
  // mqtt-status event – Requirement 10.5
  // -------------------------------------------------------------------------

  test('mqttStatus changes to "connected" when mqtt-status event fires with { status: "connected" }', () => {
    const { result } = renderHook(() => useSocket());

    act(() => {
      // Manually fire the 'mqtt-status' event
      const handler = mockSocket._handlers && mockSocket._handlers['mqtt-status'];
      if (handler) handler({ status: 'connected' });
    });

    expect(result.current.mqttStatus).toBe('connected');
  });

  test('mqttStatus changes to "disconnected" when mqtt-status event fires with { status: "disconnected" }', () => {
    const { result } = renderHook(() => useSocket());

    act(() => {
      const handler = mockSocket._handlers && mockSocket._handlers['mqtt-status'];
      if (handler) handler({ status: 'disconnected' });
    });

    expect(result.current.mqttStatus).toBe('disconnected');
  });

  // -------------------------------------------------------------------------
  // sensor-data event – Requirement 10.3
  // -------------------------------------------------------------------------

  test('sensorData is updated when sensor-data event fires', () => {
    const { result } = renderHook(() => useSocket());

    const payload = {
      temperature: 28.5,
      humidity: 65,
      relay1: 'on',
      relay2: 'off',
      humidifier: 'off',
    };

    act(() => {
      const handler = mockSocket._handlers && mockSocket._handlers['sensor-data'];
      if (handler) handler(payload);
    });

    expect(result.current.sensorData).toEqual(payload);
  });
});


// =============================================================================
// Additional unit tests for remaining socket event handlers – Task 16
// Validates: Requirements 10.3, 10.5, 8.3
// Covers: connect, disconnect, device-status, log events (previously uncovered)
// =============================================================================

describe('useSocket – additional socket event handlers (Task 16)', () => {
  beforeEach(() => {
    mockIo.mockImplementation(() => mockSocket);
    mockSocket.on.mockImplementation((event, handler) => {
      mockSocket._handlers = mockSocket._handlers || {};
      mockSocket._handlers[event] = handler;
    });
    mockSocket._handlers = {};
  });

  // -------------------------------------------------------------------------
  // connect / disconnect events
  // -------------------------------------------------------------------------

  test('socketConnected becomes true when "connect" event fires', () => {
    const { result } = renderHook(() => useSocket());

    act(() => {
      const handler = mockSocket._handlers && mockSocket._handlers['connect'];
      if (handler) handler();
    });

    expect(result.current.socketConnected).toBe(true);
  });

  test('"connect" event adds a log entry', () => {
    const { result } = renderHook(() => useSocket());

    act(() => {
      const handler = mockSocket._handlers && mockSocket._handlers['connect'];
      if (handler) handler();
    });

    expect(result.current.logs.length).toBeGreaterThan(0);
    expect(result.current.logs[0].message).toMatch(/connected/i);
  });

  test('socketConnected becomes false when "disconnect" event fires', () => {
    const { result } = renderHook(() => useSocket());

    // First connect
    act(() => {
      const connectHandler = mockSocket._handlers && mockSocket._handlers['connect'];
      if (connectHandler) connectHandler();
    });

    // Then disconnect
    act(() => {
      const disconnectHandler = mockSocket._handlers && mockSocket._handlers['disconnect'];
      if (disconnectHandler) disconnectHandler();
    });

    expect(result.current.socketConnected).toBe(false);
  });

  test('"disconnect" event adds a log entry', () => {
    const { result } = renderHook(() => useSocket());

    act(() => {
      const handler = mockSocket._handlers && mockSocket._handlers['disconnect'];
      if (handler) handler();
    });

    expect(result.current.logs.length).toBeGreaterThan(0);
    expect(result.current.logs[0].message).toMatch(/disconnected/i);
  });

  // -------------------------------------------------------------------------
  // device-status event
  // -------------------------------------------------------------------------

  test('deviceStatus is updated when "device-status" event fires', () => {
    const { result } = renderHook(() => useSocket());

    const payload = { message: 'Device online', timestamp: new Date().toISOString() };

    act(() => {
      const handler = mockSocket._handlers && mockSocket._handlers['device-status'];
      if (handler) handler(payload);
    });

    expect(result.current.deviceStatus).toEqual(payload);
  });

  test('"device-status" event adds a log entry with the device message', () => {
    const { result } = renderHook(() => useSocket());

    const payload = { message: 'Device online', timestamp: new Date().toISOString() };

    act(() => {
      const handler = mockSocket._handlers && mockSocket._handlers['device-status'];
      if (handler) handler(payload);
    });

    expect(result.current.logs.length).toBeGreaterThan(0);
    expect(result.current.logs[0].message).toContain('Device online');
  });

  // -------------------------------------------------------------------------
  // log event
  // -------------------------------------------------------------------------

  test('"log" event adds a log entry with the provided message', () => {
    const { result } = renderHook(() => useSocket());

    const payload = { message: 'MQTT publish ok', timestamp: new Date().toISOString() };

    act(() => {
      const handler = mockSocket._handlers && mockSocket._handlers['log'];
      if (handler) handler(payload);
    });

    expect(result.current.logs.length).toBeGreaterThan(0);
    expect(result.current.logs[0].message).toBe('MQTT publish ok');
  });

  // -------------------------------------------------------------------------
  // cleanup / disconnect on unmount
  // -------------------------------------------------------------------------

  test('socket.disconnect is called when hook unmounts', () => {
    mockSocket.disconnect.mockClear();
    const { unmount } = renderHook(() => useSocket());

    unmount();

    expect(mockSocket.disconnect).toHaveBeenCalledTimes(1);
  });
});

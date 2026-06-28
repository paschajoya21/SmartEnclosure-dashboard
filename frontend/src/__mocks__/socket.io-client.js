/**
 * Jest manual mock for socket.io-client
 *
 * Provides a controllable mock socket instance so tests can:
 *  - Inspect which events were registered
 *  - Trigger events programmatically via mockSocket.mockEmit()
 *  - Verify disconnect was called
 *
 * Written in CommonJS (module.exports) so Jest's CJS transform resolves
 * the named `io` export the same way the real socket.io-client does.
 */

const eventHandlers = {};

const mockSocket = {
  on: jest.fn((event, handler) => {
    eventHandlers[event] = handler;
  }),
  disconnect: jest.fn(),
  emit: jest.fn(),
  /**
   * Trigger a registered Socket.IO event from test code.
   * @param {string} event - event name (e.g. 'sensor-data')
   * @param {*} data - payload passed to the handler
   */
  mockEmit(event, data) {
    if (eventHandlers[event]) {
      eventHandlers[event](data);
    }
  },
  /**
   * Reset all recorded calls and registered handlers between tests.
   */
  mockReset() {
    Object.keys(eventHandlers).forEach((k) => delete eventHandlers[k]);
    mockSocket.on.mockClear();
    mockSocket.disconnect.mockClear();
    mockSocket.emit.mockClear();
  },
};

const io = jest.fn(() => mockSocket);

// CommonJS exports — mirrors how socket.io-client exposes `io`
module.exports = { io, mockSocket };
module.exports.default = io;

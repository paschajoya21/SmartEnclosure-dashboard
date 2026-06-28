/**
 * Jest manual mock for socket.io-client
 *
 * Placed at <rootDir>/__mocks__/socket.io-client.js so Jest automatically
 * intercepts `import { io } from 'socket.io-client'` in tests that call
 * jest.mock('socket.io-client').
 *
 * Written in CommonJS so the CJS interop in babel-jest resolves exports
 * identically to the real socket.io-client package.
 *
 * NOTE: CRA sets `resetMocks: true`, which calls .mockReset() on every
 * jest.fn() between tests.  The `restoreSocketMock()` helper re-applies
 * all implementations and should be called in beforeEach.
 */

// Plain object — persists across tests (not a jest mock, so resetMocks
// does NOT clear it).  Call mockSocket.clearHandlers() in beforeEach.
const eventHandlers = {};

const mockSocket = {
  on: jest.fn(),
  disconnect: jest.fn(),
  emit: jest.fn(),

  /**
   * Re-apply the `on` implementation after resetMocks clears it.
   * Call this from beforeEach.
   */
  restoreImplementation() {
    mockSocket.on.mockImplementation((event, handler) => {
      eventHandlers[event] = handler;
    });
  },

  /**
   * Remove all registered event handlers (plain object, not touched by
   * resetMocks).  Call this from beforeEach after restoreImplementation.
   */
  clearHandlers() {
    Object.keys(eventHandlers).forEach((k) => delete eventHandlers[k]);
  },

  /**
   * Trigger a registered Socket.IO event from test code.
   * @param {string} event
   * @param {*} data
   */
  mockEmit(event, data) {
    if (eventHandlers[event]) {
      eventHandlers[event](data);
    }
  },
};

const io = jest.fn(() => mockSocket);

module.exports = { io, mockSocket };
module.exports.default = io;

/**
 * Unit tests for backend/src/routes/control.js
 * Covers Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 */

const express = require('express');
const request = require('supertest');

// ── Mock mqttClient before requiring the router ───────────────────────────────
jest.mock('../src/mqttClient', () => ({
  getMqttStatus: jest.fn(),
  publishCommand: jest.fn(),
}));

const { getMqttStatus, publishCommand } = require('../src/mqttClient');
const controlRouter = require('../src/routes/control');
const config = require('../src/config');

// Build a minimal Express app that mounts the router
function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/control', controlRouter);
  return app;
}

// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/control — field validation (Req 3.1, 3.3)', () => {
  let app;

  beforeEach(() => {
    app = buildApp();
    getMqttStatus.mockReturnValue(true);
    publishCommand.mockReturnValue({ success: true });
  });

  test('returns 400 when body is empty (no command field)', async () => {
    const res = await request(app).post('/api/control').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
  });

  test('returns 400 when command is null', async () => {
    const res = await request(app).post('/api/control').send({ command: null });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('returns 400 when command is a number', async () => {
    const res = await request(app).post('/api/control').send({ command: 42 });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('returns 400 when command is a boolean', async () => {
    const res = await request(app).post('/api/control').send({ command: true });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('returns 400 when command is an empty string', async () => {
    const res = await request(app).post('/api/control').send({ command: '' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('returns 400 when command is whitespace-only', async () => {
    const res = await request(app).post('/api/control').send({ command: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('returns 400 when command is an unrecognised string', async () => {
    const res = await request(app)
      .post('/api/control')
      .send({ command: 'unknown_command' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/unknown_command/i);
    // Error message must list allowed commands (descriptive)
    expect(res.body.error).toMatch(/relay1_on/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/control — MQTT disconnected → 503 (Req 3.5)', () => {
  let app;

  beforeEach(() => {
    app = buildApp();
    getMqttStatus.mockReturnValue(false);
    publishCommand.mockReturnValue({ success: true });
  });

  test.each(config.allowedCommands)(
    'returns 503 for valid command "%s" when MQTT is disconnected',
    async (cmd) => {
      const res = await request(app).post('/api/control').send({ command: cmd });
      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
      // publishCommand must NOT be called
      expect(publishCommand).not.toHaveBeenCalled();
    }
  );
});

// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/control — valid command + MQTT connected → 200 (Req 3.1, 3.2, 3.4)', () => {
  let app;

  beforeEach(() => {
    app = buildApp();
    getMqttStatus.mockReturnValue(true);
    publishCommand.mockReturnValue({ success: true });
  });

  test.each(config.allowedCommands)(
    'returns 200 for valid command "%s"',
    async (cmd) => {
      const res = await request(app).post('/api/control').send({ command: cmd });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBeDefined();
      expect(res.body.command).toBe(cmd);
    }
  );

  test('publishes the trimmed command (command with surrounding spaces)', async () => {
    const res = await request(app)
      .post('/api/control')
      .send({ command: '  relay1_on  ' });
    expect(res.status).toBe(200);
    expect(publishCommand).toHaveBeenCalledWith('relay1_on');
    expect(res.body.command).toBe('relay1_on');
  });

  test('response body contains success:true, message (string), and command (string)', async () => {
    const res = await request(app)
      .post('/api/control')
      .send({ command: 'all_off' });
    expect(res.status).toBe(200);
    expect(typeof res.body.message).toBe('string');
    expect(typeof res.body.command).toBe('string');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/control — publishCommand failure → 503 (Req 3.5)', () => {
  let app;

  beforeEach(() => {
    app = buildApp();
    getMqttStatus.mockReturnValue(true);
    publishCommand.mockReturnValue({ success: false, error: 'Publish error' });
  });

  test('returns 503 when publishCommand reports failure with error message', async () => {
    const res = await request(app)
      .post('/api/control')
      .send({ command: 'relay1_on' });
    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Publish error');
  });

  test('returns 503 with fallback message when publishCommand returns no error string (covers branch line 53)', async () => {
    // publishCommand returns { success: false } — no 'error' field → hits the || fallback
    publishCommand.mockReturnValue({ success: false });
    const res = await request(app)
      .post('/api/control')
      .send({ command: 'relay1_on' });
    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Failed to publish command to MQTT broker.');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Feature: smart-reptile-enclosure-dashboard, Property 2: MQTT tidak tersedia menghasilkan 503
// Validates: Requirements 3.5
// ─────────────────────────────────────────────────────────────────────────────

const fc = require('fast-check');

describe('PBT — Property 2: MQTT tidak tersedia menghasilkan 503 (Req 3.5)', () => {
  let app;

  beforeEach(() => {
    app = buildApp();
    // Mock getMqttStatus to always return false (MQTT unavailable)
    getMqttStatus.mockReturnValue(false);
    publishCommand.mockReturnValue({ success: true });
  });

  test('semua valid command menghasilkan 503 saat MQTT tidak tersedia', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...config.allowedCommands),
        async (cmd) => {
          // Reset mock state for each run
          publishCommand.mockClear();
          getMqttStatus.mockReturnValue(false);

          const res = await request(app)
            .post('/api/control')
            .send({ command: cmd });

          // Must always return 503 — never 200, never 400
          expect(res.status).toBe(503);
          expect(res.body.success).toBe(false);
          expect(res.body.error).toBeDefined();
          // publishCommand must NOT be called when MQTT is down
          expect(publishCommand).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Feature: smart-reptile-enclosure-dashboard, Property 1: valid command diterima - invalid command ditolak
// Validates: Requirements 3.1, 3.3
// ─────────────────────────────────────────────────────────────────────────────

describe('PBT — Property 1: Valid command diterima — invalid command ditolak (Req 3.1, 3.3)', () => {
  let app;

  beforeEach(() => {
    app = buildApp();
    // MQTT is connected so valid commands can reach the 200 path
    getMqttStatus.mockReturnValue(true);
    publishCommand.mockReturnValue({ success: true });
  });

  test(
    'valid command → 200, non-valid command → 400 (100 iterasi)',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate either an allowed command or an arbitrary string
          fc.oneof(fc.constantFrom(...config.allowedCommands), fc.string()),
          async (cmd) => {
            // Reset mock call counts per run
            publishCommand.mockClear();
            getMqttStatus.mockReturnValue(true);

            const isValid = config.allowedCommands.includes(cmd);

            const res = await request(app)
              .post('/api/control')
              .send({ command: cmd });

            if (isValid) {
              // Valid command with MQTT connected must return 200
              expect(res.status).toBe(200);
              expect(res.body.success).toBe(true);
            } else {
              // Non-valid command must be rejected with 400
              expect(res.status).toBe(400);
              expect(res.body.success).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});

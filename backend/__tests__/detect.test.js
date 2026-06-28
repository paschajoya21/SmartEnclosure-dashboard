const express = require('express');
const request = require('supertest');
const detectRouter = require('../src/routes/detect');

function buildApp() {
  const app = express();
  app.use('/api/detect', detectRouter);
  return app;
}

describe('POST /api/detect', () => {
  test('accepts raw JPEG bytes and returns a quick JSON response', async () => {
    const app = buildApp();
    const jpegLikeBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0xff, 0xd9]);

    const res = await request(app)
      .post('/api/detect')
      .set('Content-Type', 'image/jpeg')
      .send(jpegLikeBuffer);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('received');
    expect(res.body.size).toBe(jpegLikeBuffer.length);
  });

  test('rejects an empty image body', async () => {
    const app = buildApp();

    const res = await request(app)
      .post('/api/detect')
      .set('Content-Type', 'image/jpeg')
      .send(Buffer.alloc(0));

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
  });
});

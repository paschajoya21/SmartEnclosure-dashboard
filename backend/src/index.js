const express = require('express');
const http = require('http');
const os = require('os');
const { Server } = require('socket.io');
const cors = require('cors');
const config = require('./config');
const { initMqtt, getMqttStatus } = require('./mqttClient');
const controlRouter = require('./routes/control');
const detectRoutes = require("./routes/detect");
const { startDetectionScheduler } = require('./detectionScheduler');

// ── Express setup ─────────────────────────────────────────────────────────────
const app = express();

app.use(cors({
  origin: '*', // allow all origins for development
  methods: ['GET', 'POST'],
}));

// Apply JSON body parser globally EXCEPT for /api/detect
// (detect receives raw binary image data, not JSON)
app.use((req, _res, next) => {
  if (req.path.startsWith('/api/detect')) return next();
  express.json()(req, _res, next);
});


function getLocalIPv4Addresses() {
  return Object.entries(os.networkInterfaces())
    .flatMap(([name, addresses]) => (addresses || [])
      .filter((address) => address.family === 'IPv4' && !address.internal)
      .map((address) => name + ': ' + address.address));
}

app.use('/uploads', express.static(require('path').join(__dirname, '../uploads')));

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    mqttConnected: getMqttStatus(),
    timestamp: new Date().toISOString(),
  });
});

// Control endpoint
app.use('/api/control', controlRouter);

// Detection endpoint endpoint
app.use("/api/detect", detectRoutes);


// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ── HTTP server + Socket.IO ───────────────────────────────────────────────────
const server = http.createServer(app);

server.requestTimeout = 45000;
server.headersTimeout = 10000;
server.keepAliveTimeout = 1000;

server.on("connection", (socket) => {
  console.log("[TCP] Connection from:", socket.remoteAddress, socket.remotePort);
});

server.on("clientError", (err, socket) => {
  console.error("[HTTP CLIENT ERROR]", err.message);

  if (socket.writable) {
    socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
  }
});

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  // Immediately push current MQTT status to the newly connected client
  // so the frontend never stays stuck on 'unknown' after connecting.
  const currentStatus = getMqttStatus() ? 'connected' : 'disconnected';
  socket.emit('mqtt-status', { status: currentStatus, timestamp: new Date().toISOString() });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// ── Start MQTT after Socket.IO is ready ───────────────────────────────────────
initMqtt(io);
startDetectionScheduler();

// ── Start server ─────────────────────────────────────────────────────────────
//const PORT = config.server.port;
//server.listen(PORT, () => {
 // console.log(`[Server] Backend running on http://localhost:${PORT}`);
 // console.log(`[Server] Socket.IO listening on port ${PORT}`);
//});
const PORT = config.server.port || 3001;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`[Server] Backend running on http://0.0.0.0:${PORT}`);
  console.log(`[Server] Socket.IO listening on port ${PORT}`);
});
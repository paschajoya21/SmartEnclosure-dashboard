const mqtt = require('mqtt');
const { getSpeciesCondition, parseRange } = require('./speciesCatalog');

const WORKFLOW_URL = process.env.ROBOFLOW_WORKFLOW_URL || 'https://serverless.roboflow.com/reptileclassification/workflows/detect-and-classify';
const CONFIDENCE_THRESHOLD = Number(process.env.DETECTION_CONFIDENCE_THRESHOLD || 60);
const MQTT_URL = process.env.MQTT_URL || 'wss://mqtt.eclipseprojects.io/mqtt';
const MQTT_BASE_TOPIC = process.env.MQTT_BASE_TOPIC || 'smart-enclosure-reptil/device01';
const DETECTION_TOPIC = MQTT_BASE_TOPIC + '/detection';

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function flattenValues(value, output = []) {
  if (!value) return output;

  if (Array.isArray(value)) {
    value.forEach((item) => flattenValues(item, output));
    return output;
  }

  if (typeof value === 'object') {
    output.push(value);
    Object.values(value).forEach((item) => flattenValues(item, output));
  }

  return output;
}

function toConfidencePercent(value) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return 0;
  return numberValue <= 1 ? Math.round(numberValue * 100) : Math.round(numberValue);
}

function extractTopPrediction(result) {
  const candidates = flattenValues(result)
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      className: item.class || item.class_name || item.label || item.name || item.predicted_class,
      confidence: item.confidence ?? item.score ?? item.probability,
    }))
    .filter((item) => item.className && item.confidence !== undefined)
    .map((item) => ({
      className: String(item.className),
      confidence: toConfidencePercent(item.confidence),
    }))
    .sort((a, b) => b.confidence - a.confidence);

  return candidates[0] || null;
}

async function runRoboflow(imageBuffer) {
  if (!process.env.ROBOFLOW_API_KEY) {
    throw new Error('ROBOFLOW_API_KEY is not configured');
  }

  const response = await fetch(WORKFLOW_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: process.env.ROBOFLOW_API_KEY,
      inputs: {
        image: { type: 'base64', value: imageBuffer.toString('base64') },
      },
    }),
  });

  const text = await response.text();
  let result;

  try {
    result = JSON.parse(text);
  } catch (_err) {
    result = { raw: text };
  }

  if (!response.ok) {
    const message = result?.message || result?.error || text || 'Roboflow request failed';
    throw new Error(message);
  }

  return {
    raw: result,
    prediction: extractTopPrediction(result),
  };
}

function buildDetectionResult(imageBuffer, roboflowResult) {
  const prediction = roboflowResult.prediction;
  const confidence = prediction ? prediction.confidence : 0;
  const catalog = prediction ? getSpeciesCondition(prediction.className) : null;
  const timestamp = new Date().toISOString();
  const previewBase64 = 'data:image/jpeg;base64,' + imageBuffer.toString('base64');

  if (!prediction) {
    return {
      status: 'unknown',
      species: null,
      confidence: 0,
      message: 'No Roboflow prediction found',
      notification: 'Spesies tidak dikenal. Aktuator dimatikan.',
      actuatorCommand: 'all_off',
      previewBase64,
      timestamp,
    };
  }

  if (!catalog || confidence < CONFIDENCE_THRESHOLD) {
    return {
      status: 'unknown',
      species: catalog ? catalog.species : null,
      predictedClass: prediction.className,
      confidence,
      message: !catalog ? 'Species is not in supported list' : 'Confidence below threshold',
      notification: 'Spesies tidak dikenal atau confidence rendah. Aktuator dimatikan.',
      actuatorCommand: 'all_off',
      previewBase64,
      timestamp,
    };
  }

  const warmRange = parseRange(catalog.warmSide);
  const humidityRange = parseRange(catalog.humidity);

  return {
    status: 'classified',
    species: catalog.species,
    scientificName: catalog.scientificName,
    predictedClass: prediction.className,
    confidence,
    conditions: {
      warmSide: catalog.warmSide,
      coolSide: catalog.coolSide,
      humidity: catalog.humidity,
      warmSideRange: warmRange,
      humidityRange,
    },
    warmSideMin: warmRange?.min ?? null,
    warmSideMax: warmRange?.max ?? null,
    humidityMin: humidityRange?.min ?? null,
    humidityMax: humidityRange?.max ?? null,
    message: 'Species classified successfully',
    previewBase64,
    timestamp,
  };
}

function compactForEsp(result) {
  const { previewBase64, ...rest } = result;
  return rest;
}

function publishDetection(result) {
  return new Promise((resolve) => {
    const client = mqtt.connect(MQTT_URL, {
      clientId: 'vercel-detect-' + Math.random().toString(16).slice(2),
      clean: true,
      connectTimeout: 5000,
      reconnectPeriod: 0,
    });

    const finish = () => {
      try { client.end(true); } catch (_err) {}
      resolve();
    };

    const timer = setTimeout(finish, 6000);

    client.on('connect', () => {
      client.publish(DETECTION_TOPIC, JSON.stringify(result), { qos: 0, retain: false }, () => {
        clearTimeout(timer);
        finish();
      });
    });

    client.on('error', () => {
      clearTimeout(timer);
      finish();
    });
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ status: 'error', message: 'Method not allowed' });
    return;
  }

  try {
    const imageBuffer = await readRequestBody(req);

    if (!imageBuffer || imageBuffer.length === 0) {
      res.status(400).json({ status: 'error', message: 'Image body is empty' });
      return;
    }

    const roboflowResult = await runRoboflow(imageBuffer);
    const detectionResult = buildDetectionResult(imageBuffer, roboflowResult);

    await publishDetection(detectionResult);

    res.status(200).json(compactForEsp(detectionResult));
  } catch (err) {
    const errorResult = {
      status: 'error',
      species: null,
      confidence: 0,
      message: err.message || 'Detection failed',
      notification: 'Deteksi gagal. Aktuator dimatikan untuk keamanan.',
      actuatorCommand: 'all_off',
      timestamp: new Date().toISOString(),
    };

    await publishDetection(errorResult);
    res.status(200).json(errorResult);
  }
};

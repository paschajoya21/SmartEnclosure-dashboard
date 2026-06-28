const config = require('./config');

function getImageInput(imageBuffer, publicImageUrl) {
  if (publicImageUrl && config.roboflow.imageInputType === 'url') {
    return { type: 'url', value: publicImageUrl };
  }

  return {
    type: 'base64',
    value: imageBuffer.toString('base64'),
  };
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

async function runRoboflowWorkflow(imageBuffer, publicImageUrl) {
  if (!config.roboflow.apiKey) {
    throw new Error('ROBOFLOW_API_KEY is not configured');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.roboflow.timeoutMs);

  try {
    const response = await fetch(config.roboflow.workflowUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        api_key: config.roboflow.apiKey,
        inputs: {
          image: getImageInput(imageBuffer, publicImageUrl),
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
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  runRoboflowWorkflow,
  extractTopPrediction,
};

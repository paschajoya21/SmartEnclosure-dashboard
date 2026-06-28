const express = require("express");
const path = require("path");
const fs = require("fs/promises");
const config = require("../config");
const { runRoboflowWorkflow } = require("../roboflowClient");
const { getSpeciesCondition } = require("../speciesCatalog");

const router = express.Router();

const rawParser = express.raw({
  type: ["image/jpeg", "image/jpg", "application/octet-stream", "*/*"],
  limit: "10mb",
});

async function saveDebugImage(imageBuffer) {
  const uploadsDir = path.join(__dirname, "../../uploads");
  await fs.mkdir(uploadsDir, { recursive: true });

  const filename = "capture_" + Date.now() + ".jpg";
  const filepath = path.join(uploadsDir, filename);
  await fs.writeFile(filepath, imageBuffer);
  console.log("[detect] Saved to:", filepath);

  return { filename, filepath };
}

function getPublicImageUrl(filename) {
  if (!config.server.publicUrl) return null;
  return config.server.publicUrl.replace(/\/$/, "") + "/uploads/" + encodeURIComponent(filename);
}

function buildDetectionPayload(prediction, condition) {
  const threshold = config.roboflow.confidenceThreshold;
  const confidence = prediction?.confidence || 0;
  const modelClass = prediction?.className || null;
  const belowThreshold = confidence < threshold;
  const knownSpecies = Boolean(condition);
  const accepted = knownSpecies && !belowThreshold;

  if (!accepted) {
    return {
      status: "unknown",
      species: null,
      modelClass,
      confidence,
      threshold,
      conditions: null,
      actuatorCommand: "all_off",
      notification: belowThreshold
        ? "Confidence " + confidence + "% di bawah threshold " + threshold + "%. Aktuator dimatikan."
        : "Class " + (modelClass || "unknown") + " tidak ada dalam daftar species. Aktuator dimatikan.",
      message: belowThreshold ? "low_confidence" : "unknown_species",
      timestamp: new Date().toISOString(),
    };
  }

  return {
    status: "classified",
    species: condition.species,
    scientificName: condition.scientificName,
    modelClass,
    confidence,
    threshold,
    conditions: {
      warmSide: condition.warmSide,
      coolSide: condition.coolSide,
      humidity: condition.humidity,
    },
    actuatorCommand: null,
    notification: null,
    message: "species_classified",
    timestamp: new Date().toISOString(),
  };
}

router.get("/", (_req, res) => {
  res.json({
    status: "ok",
    message: "Detection endpoint is ready. POST image/jpeg data to this URL.",
    timestamp: new Date().toISOString(),
  });
});

router.post("/", rawParser, async (req, res) => {
  console.log("=== /api/detect HIT ===");
  console.log("Method        :", req.method);
  console.log("Remote        :", req.socket.remoteAddress, req.socket.remotePort);
  console.log("Content-Type  :", req.headers["content-type"]);
  console.log("Content-Length:", req.headers["content-length"]);

  const imageBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);

  if (imageBuffer.length === 0) {
    console.warn("[detect] Empty body received");
    return res.status(400).json({
      status: "error",
      species: null,
      confidence: 0,
      message: "No image data received. Send a raw JPEG body with Content-Type: image/jpeg.",
      timestamp: new Date().toISOString(),
    });
  }

  console.log("[detect] Image received:", imageBuffer.length, "bytes");

  try {
    const savedImage = await saveDebugImage(imageBuffer);
    const publicImageUrl = getPublicImageUrl(savedImage.filename);
    const roboflowResult = await runRoboflowWorkflow(imageBuffer, publicImageUrl);
    const prediction = roboflowResult.prediction;
    const condition = prediction ? getSpeciesCondition(prediction.className) : null;
    const payload = buildDetectionPayload(prediction, condition);

    payload.size = imageBuffer.length;
    payload.image = {
      filename: savedImage.filename,
      publicUrl: publicImageUrl,
    };

    console.log("[detect] Result:", JSON.stringify({
      status: payload.status,
      species: payload.species,
      modelClass: payload.modelClass,
      confidence: payload.confidence,
      actuatorCommand: payload.actuatorCommand,
    }));

    res.set("Connection", "close");
    return res.status(200).json(payload);
  } catch (err) {
    console.error("[detect] Roboflow detection failed:", err.message);
    return res.status(200).json({
      status: "error",
      species: null,
      confidence: 0,
      actuatorCommand: "all_off",
      message: "roboflow_detection_failed",
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;

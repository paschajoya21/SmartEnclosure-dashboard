const express = require('express');
const router = express.Router();
const { publishCommand, getMqttStatus } = require('../mqttClient');
const config = require('../config');

/**
 * POST /api/control
 * Body: { "command": "<command_string>" }
 */
router.post('/', (req, res) => {
  const { command } = req.body;

  // Validate presence and type
  if (command === undefined || command === null || typeof command !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Field "command" is required and must be a non-empty string.',
    });
  }

  const trimmedCommand = command.trim();

  // Validate non-empty after trimming
  if (trimmedCommand.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Field "command" must not be empty or whitespace-only.',
    });
  }

  // Validate command is in the allowed list
  if (!config.allowedCommands.includes(trimmedCommand)) {
    return res.status(400).json({
      success: false,
      error: `Unknown command "${trimmedCommand}". Allowed commands: ${config.allowedCommands.join(', ')}.`,
    });
  }

  // Check MQTT connectivity
  if (!getMqttStatus()) {
    return res.status(503).json({
      success: false,
      error: 'MQTT broker is not connected. Please wait and try again.',
    });
  }

  // Publish command
  const result = publishCommand(trimmedCommand);

  if (!result.success) {
    return res.status(503).json({
      success: false,
      error: result.error || 'Failed to publish command to MQTT broker.',
    });
  }

  return res.status(200).json({
    success: true,
    message: `Command "${trimmedCommand}" has been sent successfully.`,
    command: trimmedCommand,
  });
});

module.exports = router;

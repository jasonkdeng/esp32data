const express = require('express');
const { createReading, createPersistentReading, validateReadingPayload } = require('../lib/reading-store');

// Initializes pendingCommand variable to store servo commands later on
let pendingCommand = null;

function createEsp32Router({
  readingStore,
  maxReadings,
  supabaseEnabled,
  getReadings,
  insertReading,
  requireApiKey,
  ingestionLimiter
}) {
  const router = express.Router();

  router.get('/readings', async (req, res) => {
    if (supabaseEnabled) {
      try {
        const rows = await getReadings(maxReadings);

        return res.status(200).json({
          success: true,
          count: Array.isArray(rows) ? rows.length : 0,
          latest: Array.isArray(rows) ? rows[0] || null : null,
          readings: rows
        });
      } catch (error) {
        console.error('Supabase read failed, falling back to local store', error);
      }
    }

    const readings = readingStore.list();

    return res.status(200).json({
      success: true,
      count: readings.length,
      latest: readingStore.latest(),
      readings
    });
  });

  // Route is called if dashboard posts brake position
  router.post('/brake-position', (req, res) => {

  const angle = Number(req.body.angle); // Reads angle from the request

  // Checks if the angle is valid
  if (Number.isNaN(angle) || angle < 0 || angle > 180) {
      return res.status(400).json({
        success: false,
        error: 'Angle must be between 0 and 180'
      });
    }

    // Stores the angle in pendingCommand
    pendingCommand = {
      type: 'setBrakePosition',
      angle
    };

    console.log(`Brake position command queued: ${angle}`);

    return res.status(200).json({
      success: true,
      command: pendingCommand
    });
  });

  router.post('/reset-position', (req, res) => {
    const angle = Number(req.body.angle);

    if (Number.isNaN(angle) || angle < 0 || angle > 180) {
        return res.status(400).json({
          success: false,
          error: 'Angle must be between 0 and 180'
        });
      }

    pendingCommand = {
      type: 'setResetPosition',
      angle
    };

    console.log(`Reset position command queued: ${angle}`);

    return res.status(200).json({
      success: true,
      command: pendingCommand
      });
  });

  // Route is called if esp32 gets commands
  router.get('/commands', (req, res) => {

    const command = pendingCommand;

    // Clears pendingCommand for next command
    pendingCommand = null;

    // Sends command to esp32
    return res.status(200).json({
      success: true,
      command
    });
  });

  router.post('/move-servo', (req, res) => {

    const angle = Number(req.body.angle);

    if (Number.isNaN(angle) || angle < 0 || angle > 180) {
      return res.status(400).json({
        success: false,
        error: 'Angle must be between 0 and 180'
      });
    }

    pendingCommand = {
      type: 'moveServo',
      angle
    };

    console.log(`Move servo command queued: ${angle}`);

    return res.status(200).json({
      success: true,
      command: pendingCommand
    });
  });

// Changed route to work with array posting from esp32
  router.post('/reading', ingestionLimiter, requireApiKey, async (req, res) => {
    const payload = validateReadingPayload(req.body);

    if (!payload.valid) {
      return res.status(payload.status).json({
        success: false,
        error: payload.error
      });
    }

    const readings = Array.isArray(payload.readings)
      ? payload.readings
      : [payload];

    const saved = [];

    for (const r of readings) {
      if (!r || typeof r.title !== 'string') continue;

      const reading = createReading(
        req.deviceId,
        r.title,
        r.value
      );

      readingStore.add(reading);
      saved.push(reading);
    }

    return res.status(200).json({
      success: true,
      message: 'Batch readings received',
      count: saved.length,
      received: saved
    });
  });

  return router;
}

module.exports = {
  createEsp32Router
};

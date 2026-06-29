const express = require('express');
const { createReading, validateReadingPayload } = require('../lib/reading-store');
const {addCommand, getNextCommand} = require('../lib/commands-store');

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

  router.get('/commands', (req, res) => {
    const command = getNextCommand();

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
        error: 'Angle must be 0-180'
      });
    }

    const command = addCommand({
      type: 'moveServo',
      angle
    });

    return res.status(200).json({
      success: true,
      command
    });
  });

  router.post('/move-actuator', (req, res) => {
    const position = Number(req.body.position);

    if (Number.isNaN(position) || position < 1075 || position > 1800) {
      return res.status(400).json({
        success: false,
        error: 'Position must be 1075-1800'
      });
    }

    const command = addCommand({
      type: 'moveActuator',
      position
    });

    return res.status(200).json({
      success: true,
      command
    });
  });

  router.post('/brake-position', (req, res) => {
    const angle = Number(req.body.angle);

    if (Number.isNaN(angle) || angle < 0 || angle > 180) {
      return res.status(400).json({
        success: false,
        error: 'Angle must be 0-180'
      });
    }

    const command = addCommand({
      type: 'setBrakePosition',
      angle
    });

    return res.status(200).json({
      success: true,
      command
    });
  });

  router.post('/reset-position', (req, res) => {
    const angle = Number(req.body.angle);

    if (Number.isNaN(angle) || angle < 0 || angle > 180) {
      return res.status(400).json({
        success: false,
        error: 'Angle must be 0-180'
      });
    }

    const command = addCommand({
      type: 'setResetPosition',
      angle
    });

    return res.status(200).json({
      success: true,
      command
    });
  });

  return router;
}

module.exports = {
  createEsp32Router
};
const express = require('express');
const { createReading, createPersistentReading, validateReadingPayload } = require('../lib/reading-store');

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

    const reading = createReading(req.deviceId, payload.title, payload.value);
    readingStore.add(reading);

    console.log(`ESP32 float reading received | ${reading.deviceId} | ${reading.title}: ${reading.value}`);

    if (supabaseEnabled) {
      const persistentReading = createPersistentReading(reading);

      insertReading(persistentReading).catch((error) => {
        console.error('Supabase insert failed (local accepted):', error);
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Float reading received',
      received: reading
    });
  });

  return router;
}

module.exports = {
  createEsp32Router
};

const express = require('express');
const rateLimit = require('express-rate-limit');
const { createEsp32Router } = require('./routes/esp32');
const { createReadingStore } = require('./lib/reading-store');
const { createRequireApiKeyMiddleware } = require('./middleware/require-api-key');

function createApp({
  allowedDeviceKeyMap,
  maxReadings,
  supabaseEnabled,
  getReadings,
  insertReading
}) {
  const app = express();
  const readingStore = createReadingStore(maxReadings);
  const requireApiKey = createRequireApiKeyMiddleware(allowedDeviceKeyMap);
  const ingestionLimiter = rateLimit({
    windowMs: 10 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: 'Too many readings received. Slow down and retry shortly.'
    }
  });

  app.use(express.json({ limit: '16kb' }));

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(
    '/api/esp32',
    createEsp32Router({
      readingStore,
      maxReadings,
      supabaseEnabled,
      getReadings,
      insertReading,
      requireApiKey,
      ingestionLimiter
    })
  );

  return { app, readingStore };
}

module.exports = {
  createApp
};

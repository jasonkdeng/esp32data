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

  app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://172.20.10.8:3000');
  //res.header('Access-Control-Allow-Origin', 'https://waturbineesp32dashboard.vercel.app/'); // frontend url
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  next();
  });

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

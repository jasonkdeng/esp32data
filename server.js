const express = require('express');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const maxDevices = 5;
const deviceKeysRaw = process.env.ESP32_DEVICE_KEYS;
const readings = [];
const MAX_READINGS = 200;

if (!deviceKeysRaw) {
  console.error('Missing required environment variable: ESP32_DEVICE_KEYS');
  process.exit(1);
}

let deviceKeyMap;

try {
  deviceKeyMap = JSON.parse(deviceKeysRaw);
} catch (error) {
  console.error('ESP32_DEVICE_KEYS must be valid JSON. Example: {"esp32-1":"key-1"}');
  process.exit(1);
}

if (!deviceKeyMap || typeof deviceKeyMap !== 'object' || Array.isArray(deviceKeyMap)) {
  console.error('ESP32_DEVICE_KEYS must be a JSON object with device IDs as keys.');
  process.exit(1);
}

const allowedDevices = Object.entries(deviceKeyMap)
  .map(([deviceId, key]) => [String(deviceId).trim(), typeof key === 'string' ? key.trim() : ''])
  .filter(([deviceId, key]) => deviceId !== '' && key !== '');

if (allowedDevices.length === 0) {
  console.error('ESP32_DEVICE_KEYS must contain at least one deviceId -> apiKey pair.');
  process.exit(1);
}

if (allowedDevices.length > maxDevices) {
  console.error(`ESP32_DEVICE_KEYS supports up to ${maxDevices} devices for this project.`);
  process.exit(1);
}

const allowedDeviceKeyMap = Object.fromEntries(allowedDevices);
const configuredDeviceIds = Object.keys(allowedDeviceKeyMap);

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

const requireApiKey = (req, res, next) => {
  const deviceId = (req.get('x-device-id') || '').trim();
  const headerKey = req.get('x-api-key');
  const authHeader = req.get('authorization') || '';
  const bearerKey = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const providedKey = headerKey || bearerKey;
  const expectedKey = allowedDeviceKeyMap[deviceId];

  if (!deviceId) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: missing device ID'
    });
  }

  if (!expectedKey) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: unknown device ID'
    });
  }

  if (!providedKey || providedKey !== expectedKey) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: invalid or missing API key'
    });
  }

  req.deviceId = deviceId;

  return next();
};

app.use(express.json({ limit: '16kb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/esp32/readings', (req, res) => {
  res.status(200).json({
    success: true,
    count: readings.length,
    latest: readings[0] || null,
    readings
  });
});

app.post('/api/esp32/reading', ingestionLimiter, requireApiKey, (req, res) => {
  const { value, title } = req.body;

  if (value === undefined) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: value'
    });
  }

  if (typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'Field title must be a non-empty string'
    });
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return res.status(400).json({
      success: false,
      error: 'Field value must be a valid float number'
    });
  }

  const reading = {
    deviceId: req.deviceId,
    title: title.trim(),
    value: numericValue,
    timestamp: new Date().toISOString()
  };

  readings.unshift(reading);

  if (readings.length > MAX_READINGS) {
    readings.length = MAX_READINGS;
  }

  console.log(`ESP32 float reading received | ${reading.deviceId} | ${reading.title}: ${reading.value}`);

  return res.status(200).json({
    success: true,
    message: 'Float reading received',
    received: reading
  });
});

app.listen(port, () => {
  console.log(`ESP32 API listening on port ${port}`);
  console.log(`Configured ESP32 device IDs: ${configuredDeviceIds.join(', ')}`);
});
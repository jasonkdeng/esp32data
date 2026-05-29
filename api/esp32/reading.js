const { insertReading } = require('../../lib/supabase');
const { applyCors, handleCorsPreflight } = require('../../lib/cors');
const { createReading, createPersistentReading, validateReadingPayload } = require('../../lib/reading-store');

const maxDevices = 100; // allow more for cloud

function parseDeviceKeys() {
  const deviceKeysRaw = process.env.ESP32_DEVICE_KEYS;
  if (!deviceKeysRaw) return null;
  try {
    const parsed = JSON.parse(deviceKeysRaw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return Object.fromEntries(Object.entries(parsed)
      .map(([k, v]) => [String(k).trim(), typeof v === 'string' ? v.trim() : ''])
      .filter(([k, v]) => k !== '' && v !== ''));
  } catch (e) {
    return null;
  }
}

module.exports = async function handler(req, res) {
  try {
    if (handleCorsPreflight(req, res, ['POST', 'OPTIONS'])) {
      return;
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    applyCors(res, ['POST', 'OPTIONS']);

    const allowedDeviceKeyMap = parseDeviceKeys();
    if (!allowedDeviceKeyMap) {
      return res.status(500).json({ success: false, error: 'Server misconfigured: ESP32_DEVICE_KEYS missing or invalid' });
    }

    const deviceId = (req.headers['x-device-id'] || '').trim();
    const headerKey = req.headers['x-api-key'] || '';
    const authHeader = req.headers['authorization'] || '';
    const bearerKey = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const providedKey = headerKey || bearerKey;

    if (!deviceId) {
      return res.status(401).json({ success: false, error: 'Unauthorized: missing device ID' });
    }

    const expectedKey = allowedDeviceKeyMap[deviceId];
    if (!expectedKey) {
      return res.status(401).json({ success: false, error: 'Unauthorized: unknown device ID' });
    }

    if (!providedKey || providedKey !== expectedKey) {
      return res.status(401).json({ success: false, error: 'Unauthorized: invalid or missing API key' });
    }

    const payload = validateReadingPayload(req.body);

    if (!payload.valid) {
      return res.status(payload.status).json({ success: false, error: payload.error });
    }

    const readings = payload.readings.map((item) => createReading(deviceId, item.title, item.value, item.timestamp));

    if (process.env.SUPABASE_URL) {
      readings.forEach((reading) => {
        Promise.resolve()
          .then(() => insertReading(createPersistentReading(reading)))
          .then(() => {
            console.log(`Inserted reading for ${deviceId} ${reading.title}: ${reading.value}`);
          })
          .catch((err) => {
            console.error('Supabase insert error (local accepted)', err);
          });
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Float readings accepted',
      count: readings.length,
      receivedReadings: readings,
      received: readings[0] || null
    });
  } catch (err) {
    console.error('Unhandled /api/esp32/reading error', err);
    applyCors(res, ['POST', 'OPTIONS']);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

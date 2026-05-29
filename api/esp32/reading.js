const { insertReading } = require('../../lib/supabase');

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
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

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

    const { title, value } = req.body || {};
    if (value === undefined) {
      return res.status(400).json({ success: false, error: 'Missing required field: value' });
    }

    if (typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({ success: false, error: 'Field title must be a non-empty string' });
    }

    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      return res.status(400).json({ success: false, error: 'Field value must be a valid float number' });
    }

    const reading = {
      device_id: deviceId,
      title: title.trim(),
      value: numericValue,
      timestamp: new Date().toISOString()
    };

    if (process.env.SUPABASE_URL) {
      Promise.resolve()
        .then(() => insertReading(reading))
        .then(() => {
          console.log(`Inserted reading for ${deviceId} ${reading.title}: ${reading.value}`);
        })
        .catch((err) => {
          console.error('Supabase insert error (local accepted)', err);
        });
    }

    return res.status(200).json({ success: true, message: 'Float reading accepted', received: reading });
  } catch (err) {
    console.error('Unhandled /api/esp32/reading error', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

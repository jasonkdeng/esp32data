const fs = require('fs');
const path = require('path');

const DEFAULT_PORT = 3002;
const MAX_DEVICES = 5;
const MAX_READINGS = 200;
const MAX_HEADER_SIZE = 65536;

function parseDeviceKeys(raw) {
  if (!raw) {
    throw new Error('Missing required environment variable: ESP32_DEVICE_KEYS');
  }

  let parsed;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error('ESP32_DEVICE_KEYS must be valid JSON. Example: {"esp32-1":"key-1"}');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('ESP32_DEVICE_KEYS must be a JSON object with device IDs as keys.');
  }

  const allowedDevices = Object.entries(parsed)
    .map(([deviceId, key]) => [String(deviceId).trim(), typeof key === 'string' ? key.trim() : ''])
    .filter(([deviceId, key]) => deviceId !== '' && key !== '');

  if (allowedDevices.length === 0) {
    throw new Error('ESP32_DEVICE_KEYS must contain at least one deviceId -> apiKey pair.');
  }

  if (allowedDevices.length > MAX_DEVICES) {
    throw new Error(`ESP32_DEVICE_KEYS supports up to ${MAX_DEVICES} devices for this project.`);
  }

  const allowedDeviceKeyMap = Object.fromEntries(allowedDevices);
  const configuredDeviceIds = Object.keys(allowedDeviceKeyMap);

  return { allowedDeviceKeyMap, configuredDeviceIds };
}

function createConfig(env = process.env) {
  const { allowedDeviceKeyMap, configuredDeviceIds } = parseDeviceKeys(env.ESP32_DEVICE_KEYS);
  const buildPath = path.join(__dirname, '..', 'dashboard', 'build');

  return {
    port: Number(env.PORT || DEFAULT_PORT),
    maxHeaderSize: MAX_HEADER_SIZE,
    maxReadings: MAX_READINGS,
    maxDevices: MAX_DEVICES,
    buildPath,
    hasDashboardBuild: fs.existsSync(buildPath),
    allowedDeviceKeyMap,
    configuredDeviceIds,
    supabaseEnabled: Boolean(env.SUPABASE_URL)
  };
}

module.exports = {
  createConfig,
  DEFAULT_PORT,
  MAX_DEVICES,
  MAX_READINGS,
  MAX_HEADER_SIZE
};

function createRequireApiKeyMiddleware(allowedDeviceKeyMap) {
  return function requireApiKey(req, res, next) {
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
}

module.exports = {
  createRequireApiKeyMiddleware
};

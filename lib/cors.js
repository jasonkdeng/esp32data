const allowedOrigin = process.env.CORS_ORIGIN || '*';

function applyCors(res, methods) {
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', methods.join(', '));
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-device-id, x-api-key, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function handleCorsPreflight(req, res, methods) {
  if (req.method !== 'OPTIONS') {
    return false;
  }

  applyCors(res, methods);
  return res.status(204).end();
}

module.exports = {
  applyCors,
  handleCorsPreflight
};

const { applyCors, handleCorsPreflight } = require('../lib/cors');

module.exports = function handler(req, res) {
  if (handleCorsPreflight(req, res, ['GET', 'OPTIONS'])) {
    return;
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  applyCors(res, ['GET', 'OPTIONS']);

  return res.status(200).json({
    success: true,
    status: 'ok'
  });
};

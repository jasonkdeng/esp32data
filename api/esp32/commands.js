const { applyCors, handleCorsPreflight } = require('../../lib/cors');

let pendingCommand = null;

module.exports = async function handler(req, res) {
  try {
    if (handleCorsPreflight(req, res, ['GET', 'OPTIONS'])) {
      return;
    }

    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    applyCors(res, ['GET', 'OPTIONS']);

    const command = pendingCommand;
    pendingCommand = null;

    return res.status(200).json({
      success: true,
      command
    });

  } catch (err) {
    console.error('Command error', err);
    applyCors(res, ['GET', 'OPTIONS']);
    return res.status(500).json({ success: false, error: 'Command fetch failed' });
  }
};
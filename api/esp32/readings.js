const { getReadings } = require('../../lib/supabase');
const { applyCors, handleCorsPreflight } = require('../../lib/cors');

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

    const rows = await getReadings(200);
    const latest = Array.isArray(rows) ? rows[0] || null : null;
    return res.status(200).json({ success: true, count: Array.isArray(rows) ? rows.length : 0, latest, readings: rows });
  } catch (err) {
    console.error('Supabase read error', err);
    applyCors(res, ['GET', 'OPTIONS']);
    return res.status(502).json({ success: false, error: 'Failed to fetch readings' });
  }
};

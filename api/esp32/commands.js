const { getNextCommand } = require('../../lib/commands-store');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const command = await getNextCommand();

    return res.json({
      success: true,
      command
    });
  } catch (err) {
    console.error('[commands] failed:', err);

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch command',
      command: null
    });
  }
};
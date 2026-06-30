const { addCommand } = require('../../lib/commands-store');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const position = Number(req.body.position);

  if (Number.isNaN(position) || position < 1075 || position > 1800) {
    return res.status(400).json({ error: 'Position must be 1075-1800' });
  }

  try {
    const command = await addCommand({
      type: 'moveActuator',
      position
    });

    return res.json({ success: true, command });
  } catch (err) {
    console.error('[moveActuator] failed:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to add command'
    });
  }
};
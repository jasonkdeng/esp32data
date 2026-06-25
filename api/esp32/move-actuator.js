const { addCommand } = require('../../lib/commands-store');

module.exports = (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const position = Number(req.body.position);

  if (Number.isNaN(position) || position < 1075 || position > 1800) {
    return res.status(400).json({ error: 'Position must be 1075-1800' });
  }

  const command = addCommand({
    type: 'moveActuator',
    position
  });

  return res.json({ success: true, command });
};
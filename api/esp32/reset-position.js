const { addCommand } = require('../../lib/commands-store');

module.exports = (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const angle = Number(req.body.angle);

  if (Number.isNaN(angle) || angle < 0 || angle > 180) {
    return res.status(400).json({ error: 'Angle must be 0-180' });
  }

  const command = addCommand({
    type: 'setResetPosition',
    angle
  });

  return res.json({ success: true, command });
};
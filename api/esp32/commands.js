const { getNextCommand } = require('../../lib/commands-store');

module.exports = (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const command = getNextCommand();

  return res.json({
    success: true,
    command
  });
};
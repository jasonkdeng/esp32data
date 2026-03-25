const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/esp32/reading', (req, res) => {
  const { value } = req.body;

  if (value === undefined) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: value'
    });
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return res.status(400).json({
      success: false,
      error: 'Field value must be a valid float number'
    });
  }

  console.log(`ESP32 float reading received: ${numericValue}`);

  return res.status(200).json({
    success: true,
    message: 'Float reading received',
    received: numericValue
  });
});

app.listen(port, () => {
  console.log(`ESP32 API listening on port ${port}`);
});
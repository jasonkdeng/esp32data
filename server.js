const express = require('express');

const app = express();
const port = process.env.PORT || 3000;
const readings = [];
const MAX_READINGS = 200;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/esp32/readings', (req, res) => {
  res.status(200).json({
    success: true,
    count: readings.length,
    latest: readings[0] || null,
    readings
  });
});

app.post('/api/esp32/reading', (req, res) => {
  const { value, title } = req.body;

  if (value === undefined) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: value'
    });
  }

  if (typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'Field title must be a non-empty string'
    });
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return res.status(400).json({
      success: false,
      error: 'Field value must be a valid float number'
    });
  }

  const reading = {
    title: title.trim(),
    value: numericValue,
    timestamp: new Date().toISOString()
  };

  readings.unshift(reading);

  if (readings.length > MAX_READINGS) {
    readings.length = MAX_READINGS;
  }

  console.log(`ESP32 float reading received | ${reading.title}: ${reading.value}`);

  return res.status(200).json({
    success: true,
    message: 'Float reading received',
    received: reading
  });
});

app.listen(port, () => {
  console.log(`ESP32 API listening on port ${port}`);
});
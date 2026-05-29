const fs = require('fs');
const http = require('http');
const path = require('path');
require('dotenv').config();
const { createConfig } = require('./lib/config');
const { createApp } = require('./app');
const { getReadings, insertReading } = require('./lib/supabase');

let config;

try {
  config = createConfig();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const { app } = createApp({
  allowedDeviceKeyMap: config.allowedDeviceKeyMap,
  maxReadings: config.maxReadings,
  supabaseEnabled: config.supabaseEnabled,
  getReadings,
  insertReading
});

if (config.hasDashboardBuild) {
  app.use(require('express').static(config.buildPath));

  app.get('*', (req, res) => {
    if (req.path.startsWith('/api') || req.path === '/health') {
      return res.status(404).json({ success: false, error: 'Not found' });
    }

    res.sendFile(path.join(config.buildPath, 'index.html'));
  });

  console.log(`Serving dashboard from ${config.buildPath}`);
}

const server = http.createServer({ maxHeaderSize: config.maxHeaderSize }, app);

server.listen(config.port, () => {
  console.log(`ESP32 API listening on port ${config.port}`);
  console.log(`Configured ESP32 device IDs: ${config.configuredDeviceIds.join(', ')}`);
});

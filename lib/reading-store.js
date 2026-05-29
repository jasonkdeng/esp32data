function createReadingStore(maxReadings) {
  const readings = [];

  function add(reading) {
    readings.unshift(reading);

    if (readings.length > maxReadings) {
      readings.length = maxReadings;
    }

    return reading;
  }

  function list() {
    return readings.slice();
  }

  function latest() {
    return readings[0] || null;
  }

  function count() {
    return readings.length;
  }

  return {
    add,
    list,
    latest,
    count
  };
}

function createReading(deviceId, title, value) {
  return {
    deviceId,
    title: title.trim(),
    value: Number(value),
    timestamp: new Date().toISOString()
  };
}

function createPersistentReading(reading) {
  return {
    device_id: reading.deviceId,
    title: reading.title,
    value: reading.value,
    timestamp: reading.timestamp
  };
}

function validateReadingPayload(payload) {
  const { title, value } = payload || {};

  if (value === undefined) {
    return { valid: false, status: 400, error: 'Missing required field: value' };
  }

  if (typeof title !== 'string' || title.trim() === '') {
    return { valid: false, status: 400, error: 'Field title must be a non-empty string' };
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return { valid: false, status: 400, error: 'Field value must be a valid float number' };
  }

  return {
    valid: true,
    value: numericValue,
    title: title.trim()
  };
}

module.exports = {
  createReadingStore,
  createReading,
  createPersistentReading,
  validateReadingPayload
};

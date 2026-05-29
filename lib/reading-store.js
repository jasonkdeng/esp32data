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

function normalizeTimestamp(input) {
  if (typeof input === 'string') {
    const parsed = Date.parse(input);

    if (!Number.isNaN(parsed)) {
      return new Date(parsed).toISOString();
    }
  }

  return new Date().toISOString();
}

function createReading(deviceId, title, value, timestamp) {
  return {
    deviceId,
    title: title.trim(),
    value: Number(value),
    timestamp: normalizeTimestamp(timestamp)
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
  const batchReadings = extractReadingsFromPayload(payload);

  if (!batchReadings.valid) {
    return batchReadings;
  }

  return batchReadings;
}

function extractReadingsFromPayload(payload) {
  const source = payload || {};
  const readings = [];

  if (Array.isArray(source.readings)) {
    if (source.readings.length === 0) {
      return { valid: false, status: 400, error: 'Field readings must contain at least one item' };
    }

    for (let index = 0; index < source.readings.length; index += 1) {
      const item = source.readings[index];

      if (!item || typeof item !== 'object') {
        return { valid: false, status: 400, error: `Reading at index ${index} must be an object` };
      }

      const title = item.title;
      const value = item.value;

      if (typeof title !== 'string' || title.trim() === '') {
        return { valid: false, status: 400, error: `Reading at index ${index} is missing a valid title` };
      }

      const numericValue = Number(value);

      if (!Number.isFinite(numericValue)) {
        return { valid: false, status: 400, error: `Reading at index ${index} has an invalid value` };
      }

      readings.push({
        title: title.trim(),
        value: numericValue,
        timestamp: normalizeTimestamp(item.timestamp || source.timestamp)
      });
    }

    return { valid: true, readings, timestamp: normalizeTimestamp(source.timestamp) };
  }

  for (let index = 1; index <= 16; index += 1) {
    const titleKey = index === 1 ? 'title' : `title${index}`;
    const valueKey = index === 1 ? 'value' : `value${index}`;
    const titleExists = Object.prototype.hasOwnProperty.call(source, titleKey);
    const valueExists = Object.prototype.hasOwnProperty.call(source, valueKey);

    if (!titleExists && !valueExists) {
      continue;
    }

    if (titleExists !== valueExists) {
      return {
        valid: false,
        status: 400,
        error: `Field ${titleExists ? valueKey : titleKey} must be provided with its matching pair`
      };
    }

    const title = source[titleKey];
    const value = source[valueKey];

    if (typeof title !== 'string' || title.trim() === '') {
      return { valid: false, status: 400, error: `Field ${titleKey} must be a non-empty string` };
    }

    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
      return { valid: false, status: 400, error: `Field ${valueKey} must be a valid float number` };
    }

    readings.push({
      title: title.trim(),
      value: numericValue,
      timestamp: normalizeTimestamp(source.timestamp)
    });
  }

  if (readings.length === 0) {
    return {
      valid: false,
      status: 400,
      error: 'Request must include a readings array or at least one title/value pair'
    };
  }

  return { valid: true, readings, timestamp: normalizeTimestamp(source.timestamp) };
}

module.exports = {
  createReadingStore,
  createReading,
  createPersistentReading,
  validateReadingPayload,
  extractReadingsFromPayload,
  normalizeTimestamp
};

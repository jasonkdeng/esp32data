const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  // don't throw here; functions will check and return errors if unset
}

async function _fetch(...args) {
  if (!globalThis.fetch) {
    throw new Error('fetch is not available in this runtime');
  }

  return globalThis.fetch(...args);
}

async function insertReading(reading) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Supabase not configured (SUPABASE_URL / SUPABASE_KEY missing)');
  }

  const url = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/readings`;

  const res = await _fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`
    },
    body: JSON.stringify(reading)
  });

  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`Supabase insert failed: ${res.status} ${text}`);
    err.status = res.status;
    throw err;
  }

  const body = await res.text();

  if (!body) {
    return null;
  }

  try {
    return JSON.parse(body);
  } catch (error) {
    return body;
  }
}

async function getReadings(limit = 200) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Supabase not configured (SUPABASE_URL / SUPABASE_KEY missing)');
  }

  const base = SUPABASE_URL.replace(/\/$/, '');
  const url = `${base}/rest/v1/readings?select=*&order=timestamp.desc&limit=${limit}`;

  const res = await _fetch(url, {
    method: 'GET',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`
    }
  });

  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`Supabase get failed: ${res.status} ${text}`);
    err.status = res.status;
    throw err;
  }

  return res.json();
}

module.exports = {
  insertReading,
  getReadings
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function _fetch(...args) {
  if (!globalThis.fetch) {
    throw new Error('fetch is not available in this runtime');
  }
  return globalThis.fetch(...args);
}

function baseUrl() {
  return SUPABASE_URL.replace(/\/$/, '');
}

async function addCommand(command) {
  const url = `${baseUrl()}/rest/v1/commands`;

  const payload = {
    type: command.type,
    angle: command.angle ?? null,
    position: command.position ?? null
  };

  const res = await _fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase addCommand failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data?.[0] || null;
}

async function getNextCommand() {
  const base = baseUrl();

  // 1. Get oldest command
  const getUrl =
    `${base}/rest/v1/commands?select=*&order=created_at.asc&limit=1`;

  const res = await _fetch(getUrl, {
    method: 'GET',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase getNextCommand failed: ${res.status} ${text}`);
  }

  const data = await res.json();

  if (!data || data.length === 0) {
    return null;
  }

  const command = data[0];

  // 2. Delete it (consume queue item)
  const delUrl = `${base}/rest/v1/commands?id=eq.${command.id}`;

  await _fetch(delUrl, {
    method: 'DELETE',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`
    }
  });

  return command;
}

module.exports = {
  addCommand,
  getNextCommand
};
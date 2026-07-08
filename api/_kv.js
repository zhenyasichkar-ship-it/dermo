/**
 * Мінімальний хелпер для Vercel KV (Upstash Redis) через REST API.
 * Не потребує npm-залежностей — працює на голому fetch.
 *
 * Змінні оточення (Vercel створює їх автоматично, коли ви додаєте KV Storage):
 *   KV_REST_API_URL
 *   KV_REST_API_TOKEN
 */

export function kvEnabled() {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

async function kvCommand(cmd) {
  const res = await fetch(process.env.KV_REST_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(cmd),
  });
  if (!res.ok) throw new Error(`KV error ${res.status}`);
  const data = await res.json();
  return data.result;
}

export async function kvGet(key) {
  const raw = await kvCommand(['GET', key]);
  if (raw === null || raw === undefined) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export async function kvSet(key, value) {
  return kvCommand(['SET', key, JSON.stringify(value)]);
}

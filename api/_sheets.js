/**
 * Хелпер для Google Sheets через Apps Script Web App.
 * Весь трафік до таблиці йде звідси (секрет ніколи не потрапляє в браузер).
 *
 * Змінні оточення:
 *   SHEETS_URL    — URL веб-застосунку Apps Script (…/exec)
 *   SHEETS_SECRET — секрет, що збігається з SECRET у скрипті таблиці
 */

export function sheetsEnabled() {
  return !!(process.env.SHEETS_URL && process.env.SHEETS_SECRET);
}

export async function sheetsGet(params) {
  const url = new URL(process.env.SHEETS_URL);
  url.searchParams.set('secret', process.env.SHEETS_SECRET);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Sheets GET ${res.status}`);
  return res.json();
}

export async function sheetsPost(body) {
  const res = await fetch(process.env.SHEETS_URL, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: process.env.SHEETS_SECRET, ...body }),
  });
  if (!res.ok) throw new Error(`Sheets POST ${res.status}`);
  return res.json();
}

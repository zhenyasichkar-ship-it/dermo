/**
 * Діагностика підключень. Відкрийте /api/health у браузері.
 * НЕ показує самих секретів — лише чи вони задані та що відповідає таблиця.
 */

export default async function handler(req, res) {
  const out = {
    tgConfigured: !!(process.env.TG_BOT_TOKEN && process.env.TG_CHAT_ID),
    sheetsUrlSet: !!process.env.SHEETS_URL,
    sheetsSecretSet: !!process.env.SHEETS_SECRET,
    urlEndsWithExec: /\/exec$/.test(process.env.SHEETS_URL || ''),
    httpStatus: null,
    finalHost: null,
    bodySnippet: null,
    sheetsReachable: false,
    sheetsResponse: null,
    error: null,
  };

  if (process.env.SHEETS_URL && process.env.SHEETS_SECRET) {
    try {
      const url = new URL(process.env.SHEETS_URL);
      url.searchParams.set('secret', process.env.SHEETS_SECRET);
      url.searchParams.set('action', 'taken');
      url.searchParams.set('date', '2000-01-01');

      const r = await fetch(url, { redirect: 'follow' });
      out.httpStatus = r.status;
      try {
        const f = new URL(r.url);
        out.finalHost = f.host; // куди врешті привів запит (напр. accounts.google.com = потрібен логін)
      } catch {}

      const text = await r.text();
      out.bodySnippet = text.slice(0, 160).replace(/\s+/g, ' ');
      try {
        out.sheetsResponse = JSON.parse(text);
        out.sheetsReachable = true;
      } catch { /* не JSON — лишиться bodySnippet */ }
    } catch (e) {
      out.error = String((e && e.message) || e);
    }
  }

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json(out);
}

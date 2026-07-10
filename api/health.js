/**
 * Діагностика підключень. Відкрийте /api/health у браузері.
 */

import { dbEnabled, q, ensureTable } from './_db.js';

export default async function handler(req, res) {
  const out = {
    tgConfigured: !!(process.env.TG_BOT_TOKEN && process.env.TG_CHAT_ID),
    dbUrlSet: dbEnabled(),
    // імена (без значень!) змінних, схожих на підключення до БД — щоб бачити, як їх назвав Neon
    dbEnvKeys: Object.keys(process.env).filter((k) => /(POSTGRES|DATABASE|PG_|NEON)/i.test(k)),
    dbReachable: false,
    bookingsCount: null,
    error: null,
  };

  if (dbEnabled()) {
    try {
      await ensureTable();
      const r = await q(`SELECT count(*)::int AS n FROM bookings`);
      out.dbReachable = true;
      out.bookingsCount = r[0].n;
    } catch (e) {
      out.error = String((e && e.message) || e);
    }
  }

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json(out);
}

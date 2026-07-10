/**
 * Публічний ендпоінт: які часи вже зайняті на конкретну дату.
 *   GET /api/slots?date=YYYY-MM-DD  →  { ok, taken: ["09:00","10:30", …] }
 */

import { dbEnabled, q, ensureTable } from './_db.js';

export default async function handler(req, res) {
  const date = String(req.query.date || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ ok: false, error: 'bad date' });
  }

  res.setHeader('Cache-Control', 'no-store');

  if (!dbEnabled()) return res.status(200).json({ ok: true, taken: [] });

  try {
    await ensureTable();
    const rows = await q(
      `SELECT btime FROM bookings WHERE bdate = $1 AND status <> 'Скасовано'`,
      [date]);
    return res.status(200).json({ ok: true, taken: rows.map((r) => r.btime) });
  } catch (err) {
    console.error('slots error:', err);
    return res.status(200).json({ ok: true, taken: [] });
  }
}

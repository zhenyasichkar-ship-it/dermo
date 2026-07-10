/**
 * Публічний ендпоінт: які часи вже зайняті на конкретну дату.
 * Використовується календарем на сайті, щоб приховати зайняті слоти.
 *   GET /api/slots?date=YYYY-MM-DD  →  { ok, taken: ["09:00","10:30", …] }
 */

import { sheetsEnabled, sheetsGet } from './_sheets.js';

export default async function handler(req, res) {
  const date = String(req.query.date || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ ok: false, error: 'bad date' });
  }

  res.setHeader('Cache-Control', 'no-store');

  if (!sheetsEnabled()) {
    return res.status(200).json({ ok: true, taken: [] });
  }

  try {
    const data = await sheetsGet({ action: 'taken', date });
    return res.status(200).json({ ok: true, taken: Array.isArray(data.taken) ? data.taken : [] });
  } catch (err) {
    console.error('slots error:', err);
    return res.status(200).json({ ok: true, taken: [] });
  }
}

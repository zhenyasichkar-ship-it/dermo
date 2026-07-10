/**
 * Захищений ендпоінт адмін-панелі.
 * Вхід: логін + пароль (звіряються зі змінними оточення).
 *
 * Змінні оточення:
 *   ADMIN_LOGIN     — логін (за замовчуванням "67")
 *   ADMIN_PASSWORD  — пароль (за замовчуванням "69")
 *   DATABASE_URL    — база (додається Vercel автоматично)
 *
 * ⚠️ Заявки містять телефони пацієнтів. Для реального сайту ОБОВ'ЯЗКОВО
 * задайте надійний ADMIN_PASSWORD у Vercel (значення 67/69 — лише демо).
 */

import { dbEnabled, q, ensureTable } from './_db.js';

function checkAuth(body) {
  const login = process.env.ADMIN_LOGIN || '67';
  const pass = process.env.ADMIN_PASSWORD || '69';
  return String(body?.login) === login && String(body?.password) === pass;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  if (!checkAuth(req.body)) {
    return res.status(401).json({ ok: false, error: 'Невірний логін або пароль' });
  }

  const { action } = req.body || {};

  if (action === 'login') {
    return res.status(200).json({ ok: true, sheets: dbEnabled() });
  }

  if (!dbEnabled()) {
    if (action === 'data') return res.status(200).json({ ok: true, sheets: false, rows: [] });
    return res.status(200).json({ ok: false, error: 'База даних не підключена' });
  }

  try {
    await ensureTable();

    if (action === 'data') {
      const rows = await q(
        `SELECT id,
                to_char(received AT TIME ZONE 'Europe/Kyiv', 'YYYY-MM-DD HH24:MI') AS received,
                name, phone, message,
                bdate AS date, btime AS time, status
         FROM bookings
         ORDER BY received ASC`);
      return res.status(200).json({ ok: true, sheets: true, rows });
    }

    if (action === 'update') {
      const { id, name, phone, message, date, time, status } = req.body;
      await q(
        `UPDATE bookings
         SET name = $2, phone = $3, message = $4, bdate = $5, btime = $6, status = $7
         WHERE id = $1`,
        [id, name || '', phone || '', message || '', date || '', time || '', status || 'Нова']);
      return res.status(200).json({ ok: true });
    }

    if (action === 'delete') {
      await q(`DELETE FROM bookings WHERE id = $1`, [req.body.id]);
      return res.status(200).json({ ok: true });
    }
  } catch (err) {
    console.error('admin error:', err);
    return res.status(500).json({ ok: false, error: 'Помилка бази даних' });
  }

  return res.status(400).json({ ok: false, error: 'Невідома дія' });
}

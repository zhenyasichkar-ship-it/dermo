/**
 * Захищений ендпоінт адмін-панелі.
 * Вхід: логін + пароль (звіряються зі змінними оточення).
 *
 * Змінні оточення:
 *   ADMIN_LOGIN     — логін (за замовчуванням "67")
 *   ADMIN_PASSWORD  — пароль (за замовчуванням "69")
 *   SHEETS_*        — доступ до таблиці із заявками
 *
 * ⚠️ Заявки містять телефони пацієнтів. Для реального сайту ОБОВ'ЯЗКОВО
 * задайте надійний ADMIN_PASSWORD у Vercel (значення 67/69 — лише демо).
 */

import { sheetsEnabled, sheetsGet } from './_sheets.js';

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
    return res.status(200).json({ ok: true, sheets: sheetsEnabled() });
  }

  if (action === 'data') {
    if (!sheetsEnabled()) {
      return res.status(200).json({ ok: true, sheets: false, rows: [] });
    }
    try {
      const data = await sheetsGet({ action: 'stats' });
      return res.status(200).json({ ok: true, sheets: true, rows: data.rows || [] });
    } catch (err) {
      console.error('admin data error:', err);
      return res.status(500).json({ ok: false, error: 'Не вдалося завантажити дані' });
    }
  }

  return res.status(400).json({ ok: false, error: 'Невідома дія' });
}

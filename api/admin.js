/**
 * Захищений ендпоінт адмін-панелі.
 * Авторизація: заголовок  Authorization: Bearer <ADMIN_PASSWORD>
 *
 * Змінні оточення:
 *   ADMIN_PASSWORD — пароль для входу в /admin
 *   KV_*           — для доступу до бази заявок і налаштувань
 *
 * Дії (POST, body { action, ... }):
 *   login        — перевірка пароля
 *   listLeads    — список заявок
 *   updateLead   — { id, status } змінити статус заявки
 *   deleteLead   — { id } видалити заявку
 *   getSettings  — поточні налаштування
 *   saveSettings — { settings } зберегти налаштування
 */

import { kvEnabled, kvGet, kvSet } from './_kv.js';
import { DEFAULT_SETTINGS, sanitizeSettings } from './_settings.js';

function authorized(req) {
  const pass = process.env.ADMIN_PASSWORD;
  if (!pass) return false;
  const header = req.headers.authorization || '';
  const token = header.replace(/^Bearer\s+/i, '');
  return token === pass;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  if (!process.env.ADMIN_PASSWORD) {
    return res.status(500).json({ ok: false, error: 'ADMIN_PASSWORD не налаштовано на сервері' });
  }
  if (!authorized(req)) {
    return res.status(401).json({ ok: false, error: 'Невірний пароль' });
  }

  const { action } = req.body || {};

  // Логін — просто підтверджуємо, що пароль вірний
  if (action === 'login') {
    return res.status(200).json({ ok: true, kv: kvEnabled() });
  }

  // Далі всі дії потребують KV
  if (!kvEnabled()) {
    return res.status(200).json({
      ok: true,
      kv: false,
      leads: [],
      settings: DEFAULT_SETTINGS,
      note: 'База даних (KV) не підключена — заявки не зберігаються.',
    });
  }

  try {
    switch (action) {
      case 'listLeads': {
        const leads = (await kvGet('leads')) || [];
        return res.status(200).json({ ok: true, kv: true, leads });
      }
      case 'updateLead': {
        const { id, status } = req.body;
        const leads = (await kvGet('leads')) || [];
        const lead = leads.find((l) => l.id === id);
        if (lead) lead.status = status === 'done' ? 'done' : 'new';
        await kvSet('leads', leads);
        return res.status(200).json({ ok: true, leads });
      }
      case 'deleteLead': {
        const { id } = req.body;
        let leads = (await kvGet('leads')) || [];
        leads = leads.filter((l) => l.id !== id);
        await kvSet('leads', leads);
        return res.status(200).json({ ok: true, leads });
      }
      case 'getSettings': {
        const saved = (await kvGet('settings')) || {};
        return res.status(200).json({ ok: true, settings: { ...DEFAULT_SETTINGS, ...saved } });
      }
      case 'saveSettings': {
        const clean = sanitizeSettings(req.body.settings);
        await kvSet('settings', clean);
        return res.status(200).json({ ok: true, settings: { ...DEFAULT_SETTINGS, ...clean } });
      }
      default:
        return res.status(400).json({ ok: false, error: 'Невідома дія' });
    }
  } catch (err) {
    console.error('admin error:', err);
    return res.status(500).json({ ok: false, error: 'Помилка сервера' });
  }
}

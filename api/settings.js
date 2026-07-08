/**
 * Публічний ендпоінт: віддає поточні налаштування сайту (телефон, графік тощо).
 * Використовується головною сторінкою для підстановки актуальних значень.
 * Без авторизації — віддає лише безпечні для публіки поля.
 */

import { kvEnabled, kvGet } from './_kv.js';
import { DEFAULT_SETTINGS } from './_settings.js';

export default async function handler(req, res) {
  let settings = { ...DEFAULT_SETTINGS };
  try {
    if (kvEnabled()) {
      const saved = await kvGet('settings');
      if (saved) settings = { ...settings, ...saved };
    }
  } catch (err) {
    console.error('settings read error:', err);
  }
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json(settings);
}

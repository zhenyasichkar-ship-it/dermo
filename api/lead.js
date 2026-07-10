/**
 * Vercel Serverless Function: приймає запис із форми,
 * зберігає його в Postgres і надсилає сповіщення в Telegram.
 *
 * Змінні оточення:
 *   TG_BOT_TOKEN, TG_CHAT_ID   — Telegram-бот
 *   DATABASE_URL (або POSTGRES_URL) — база (додається Vercel автоматично)
 */

import { dbEnabled, q, ensureTable } from './_db.js';
import { isValidSlot } from './_config.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { name, phone, message, website, date, time } = req.body || {};

  if (website) return res.status(200).json({ ok: true }); // honeypot

  const cleanName = String(name || '').trim().slice(0, 100);
  const cleanPhone = String(phone || '').trim().slice(0, 30);
  const cleanMessage = String(message || '').trim().slice(0, 1000);
  const cleanDate = String(date || '').trim();
  const cleanTime = String(time || '').trim();

  if (!cleanName || cleanPhone.replace(/\D/g, '').length < 10) {
    return res.status(400).json({ ok: false, error: 'Вкажіть ім\'я та коректний телефон' });
  }
  if (!isValidSlot(cleanDate, cleanTime)) {
    return res.status(400).json({ ok: false, error: 'Оберіть коректний день і час запису' });
  }

  // 1) Зберігаємо в базу (із перевіркою на подвійний запис)
  if (dbEnabled()) {
    try {
      await ensureTable();
      const taken = await q(
        `SELECT 1 FROM bookings WHERE bdate = $1 AND btime = $2 AND status <> 'Скасовано' LIMIT 1`,
        [cleanDate, cleanTime]);
      if (taken.length) {
        return res.status(409).json({ ok: false, error: 'На жаль, цей час щойно зайняли. Оберіть інший, будь ласка.' });
      }
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      await q(
        `INSERT INTO bookings (id, name, phone, message, bdate, btime, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'Нова')`,
        [id, cleanName, cleanPhone, cleanMessage, cleanDate, cleanTime]);
    } catch (err) {
      console.error('DB error:', err);
      // не блокуємо — принаймні надішлемо в Telegram
    }
  }

  // 2) Сповіщення в Telegram
  const token = process.env.TG_BOT_TOKEN;
  const chatId = process.env.TG_CHAT_ID;
  if (token && chatId) {
    const dateLabel = formatDateUk(cleanDate);
    const text = [
      '🩺 <b>Новий запис на консультацію</b>',
      '',
      `👤 <b>Ім'я:</b> ${escapeHtml(cleanName)}`,
      `📞 <b>Телефон:</b> <code>${escapeHtml(cleanPhone)}</code>`,
      `📅 <b>Запис на:</b> ${escapeHtml(dateLabel)}, <b>${escapeHtml(cleanTime)}</b>`,
      cleanMessage ? `💬 <b>Що турбує:</b> ${escapeHtml(cleanMessage)}` : null,
    ].filter((l) => l !== null).join('\n');

    try {
      const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
      });
      const tgData = await tgRes.json();
      if (!tgData.ok) console.error('Telegram API error:', tgData);
    } catch (err) {
      console.error('Telegram request failed:', err);
    }
  }

  return res.status(200).json({ ok: true });
}

function formatDateUk(iso) {
  try {
    return new Date(`${iso}T12:00:00Z`).toLocaleDateString('uk-UA', {
      day: '2-digit', month: 'long', weekday: 'long',
    });
  } catch { return iso; }
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

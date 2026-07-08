/**
 * Vercel Serverless Function: приймає заявку з форми
 * та надсилає повідомлення в Telegram через бота.
 *
 * Потрібні змінні оточення (Vercel → Settings → Environment Variables):
 *   TG_BOT_TOKEN — токен бота від @BotFather
 *   TG_CHAT_ID   — ваш chat_id (дізнатися у @userinfobot)
 *
 * Якщо підключено Vercel KV — заявка додатково зберігається в базу
 * для перегляду в адмін-панелі (/admin).
 */

import { kvEnabled, kvGet, kvSet } from './_kv.js';

const MAX_LEADS = 500; // зберігаємо останні N заявок

async function saveLead(lead) {
  if (!kvEnabled()) return;
  try {
    const leads = (await kvGet('leads')) || [];
    leads.unshift(lead);
    await kvSet('leads', leads.slice(0, MAX_LEADS));
  } catch (err) {
    console.error('Не вдалося зберегти заявку в KV:', err);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { name, phone, message, website } = req.body || {};

  // Honeypot: справжні користувачі не бачать це поле — якщо воно
  // заповнене, це спам-бот. Відповідаємо "ok", щоб бот не повторював спроби.
  if (website) {
    return res.status(200).json({ ok: true });
  }

  const cleanName = String(name || '').trim().slice(0, 100);
  const cleanPhone = String(phone || '').trim().slice(0, 30);
  const cleanMessage = String(message || '').trim().slice(0, 1000);

  if (!cleanName || cleanPhone.replace(/\D/g, '').length < 10) {
    return res.status(400).json({ ok: false, error: 'Некоректні дані форми' });
  }

  const token = process.env.TG_BOT_TOKEN;
  const chatId = process.env.TG_CHAT_ID;

  if (!token || !chatId) {
    console.error('TG_BOT_TOKEN / TG_CHAT_ID не налаштовані');
    return res.status(500).json({ ok: false, error: 'Сервіс тимчасово недоступний' });
  }

  // Зберігаємо заявку в базу (для адмінки), навіть якщо Telegram не відповість
  await saveLead({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: cleanName,
    phone: cleanPhone,
    message: cleanMessage,
    ts: new Date().toISOString(),
    status: 'new',
  });

  const text = [
    '🩺 <b>Нова заявка з сайту!</b>',
    '',
    `👤 <b>Ім'я:</b> ${escapeHtml(cleanName)}`,
    `📞 <b>Телефон:</b> ${escapeHtml(cleanPhone)}`,
    cleanMessage ? `💬 <b>Повідомлення:</b> ${escapeHtml(cleanMessage)}` : null,
    '',
    `🕐 ${new Date().toLocaleString('uk-UA', { timeZone: 'Europe/Kyiv' })}`,
  ]
    .filter((line) => line !== null)
    .join('\n');

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    });

    const tgData = await tgRes.json();

    if (!tgData.ok) {
      console.error('Telegram API error:', tgData);
      return res.status(502).json({ ok: false, error: 'Не вдалося надіслати повідомлення' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Telegram request failed:', err);
    return res.status(502).json({ ok: false, error: 'Не вдалося надіслати повідомлення' });
  }
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

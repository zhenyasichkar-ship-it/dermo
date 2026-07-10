/**
 * Діагностика підключень. Відкрийте /api/health у браузері.
 * НЕ показує самих секретів — лише чи вони задані та чи відповідає таблиця.
 */

import { sheetsEnabled, sheetsGet } from './_sheets.js';

export default async function handler(req, res) {
  const out = {
    tgConfigured: !!(process.env.TG_BOT_TOKEN && process.env.TG_CHAT_ID),
    sheetsUrlSet: !!process.env.SHEETS_URL,
    sheetsSecretSet: !!process.env.SHEETS_SECRET,
    sheetsReachable: false,
    sheetsResponse: null,
    error: null,
  };

  if (sheetsEnabled()) {
    try {
      const data = await sheetsGet({ action: 'taken', date: '2000-01-01' });
      out.sheetsReachable = true;
      out.sheetsResponse = data; // {ok:true,taken:[]} — добре; {ok:false,error:'unauthorized'} — не збігається SECRET
    } catch (e) {
      out.error = String((e && e.message) || e);
    }
  }

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json(out);
}

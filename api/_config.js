/**
 * Розклад прийому — єдине джерело правди для календаря запису.
 * Ті самі значення продубльовані у фронтенді (script.js, об'єкт BOOKING),
 * щоб календар малювався без зайвого запиту. Міняти тут і там одночасно.
 */
export const SCHEDULE = {
  workDays: [1, 2, 3, 4, 5], // 0=Нд, 1=Пн … 6=Сб → Пн–Пт
  startMin: 9 * 60,          // 09:00
  endMin: 19 * 60,           // 19:00 (останній слот починається о 18:30)
  stepMin: 30,               // тривалість прийому
  horizonDays: 14,           // на скільки днів наперед відкрито запис
  tz: 'Europe/Kyiv',
};

export function pad(n) {
  return String(n).padStart(2, '0');
}

export function minutesToHHMM(m) {
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

export function generateSlots() {
  const out = [];
  for (let m = SCHEDULE.startMin; m < SCHEDULE.endMin; m += SCHEDULE.stepMin) {
    out.push(minutesToHHMM(m));
  }
  return out;
}

// Дата "сьогодні" у часовому поясі Києва як 'YYYY-MM-DD'
export function todayKyiv() {
  return new Date().toLocaleDateString('en-CA', { timeZone: SCHEDULE.tz });
}

// Перевірка, що обраний слот дійсний (робочий день, у сітці, не в минулому, у межах горизонту)
export function isValidSlot(dateStr, timeStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr || '')) return false;
  if (!generateSlots().includes(timeStr)) return false;

  const dow = new Date(`${dateStr}T12:00:00Z`).getUTCDay();
  if (!SCHEDULE.workDays.includes(dow)) return false;

  const today = todayKyiv();
  if (dateStr < today) return false;

  const horizon = new Date(`${today}T12:00:00Z`);
  horizon.setUTCDate(horizon.getUTCDate() + SCHEDULE.horizonDays);
  const horizonStr = horizon.toISOString().slice(0, 10);
  if (dateStr > horizonStr) return false;

  return true;
}

/**
 * Налаштування сайту, які можна редагувати в адмін-панелі.
 * Значення за замовчуванням = поточний вміст сайту.
 * Реальні значення (якщо змінені) зберігаються в KV під ключем "settings".
 */
export const DEFAULT_SETTINGS = {
  phoneDisplay: '+38 (067) 666-14-88',
  phoneRaw: '+380676661488',
  telegram: '@zhenya1771',
  schedule: 'Пн–Сб: 9:00–19:00',
  priceNote: 'за домовленістю',
  addressNote: 'Точну адресу підтверджую під час запису на прийом',
};

// Дозволяємо зберігати лише відомі ключі
export function sanitizeSettings(input) {
  const out = {};
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    if (typeof input?.[key] === 'string') {
      out[key] = input[key].trim().slice(0, 200);
    }
  }
  return out;
}

/**
 * Google Apps Script для прийому заявок із сайту дерматолога.
 *
 * ЯК ПІДКЛЮЧИТИ (детально — у README проєкту):
 *  1. Створіть Google Таблицю.
 *  2. Розширення → Apps Script → вставте цей код.
 *  3. Замініть SECRET нижче на свій довгий рядок (літери+цифри).
 *  4. Розгорнути → Новий розгорток → тип "Веб-застосунок":
 *       Виконувати від імені: Я
 *       Хто має доступ: Усі (Anyone)
 *     Скопіюйте URL виду https://script.google.com/macros/s/…/exec
 *  5. У Vercel додайте змінні: SHEETS_URL = цей URL, SHEETS_SECRET = ваш SECRET.
 */

const SECRET = 'ЗАМІНІТЬ_НА_ДОВГИЙ_СЕКРЕТ_abc123XYZ';
const SHEET_NAME = 'Заявки';
const HEADERS = ['Отримано', 'Ім\'я', 'Телефон', 'Що турбує', 'Дата запису', 'Час', 'Статус'];
const TZ = 'Europe/Kyiv';

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) sh.appendRow(HEADERS);
  return sh;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// GET: ?action=taken&date=YYYY-MM-DD   або   ?action=stats
function doGet(e) {
  const p = e.parameter || {};
  if (p.secret !== SECRET) return json({ ok: false, error: 'unauthorized' });
  const sh = getSheet();
  const data = sh.getDataRange().getValues();

  if (p.action === 'taken') {
    const taken = [];
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][4]) === p.date && data[i][6] !== 'Скасовано') {
        taken.push(String(data[i][5]));
      }
    }
    return json({ ok: true, taken: taken });
  }

  if (p.action === 'stats') {
    const rows = [];
    for (let i = 1; i < data.length; i++) {
      const r = data[i];
      rows.push({
        received: fmt(r[0]),
        name: r[1], phone: r[2], message: r[3],
        date: String(r[4]), time: String(r[5]), status: r[6],
      });
    }
    return json({ ok: true, total: rows.length, rows: rows });
  }

  return json({ ok: false, error: 'unknown action' });
}

// POST: { action:"add", name, phone, message, date, time }
function doPost(e) {
  let body = {};
  try { body = JSON.parse(e.postData.contents); } catch (err) {}
  if (body.secret !== SECRET) return json({ ok: false, error: 'unauthorized' });

  if (body.action === 'add') {
    const sh = getSheet();
    const data = sh.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][4]) === body.date && String(data[i][5]) === body.time && data[i][6] !== 'Скасовано') {
        return json({ ok: false, error: 'taken' });
      }
    }
    sh.appendRow([new Date(), body.name || '', body.phone || '', body.message || '', body.date || '', body.time || '', 'Нова']);
    return json({ ok: true });
  }

  return json({ ok: false, error: 'unknown action' });
}

function fmt(d) {
  try { return Utilities.formatDate(new Date(d), TZ, 'yyyy-MM-dd HH:mm'); }
  catch (e) { return String(d); }
}

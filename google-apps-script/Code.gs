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
 *
 * ⚠️ Якщо ви оновлюєте код (додався стовпець ID) — після вставлення
 * зробіть Розгорнути → Керувати розгортками → ✏️ → Версія: Нова → Розгорнути.
 */

const SECRET = 'ЗАМІНІТЬ_НА_ДОВГИЙ_СЕКРЕТ_abc123XYZ';
const SHEET_NAME = 'Заявки';
const HEADERS = ['ID', 'Отримано', 'Ім\'я', 'Телефон', 'Що турбує', 'Дата запису', 'Час', 'Статус'];
const TZ = 'Europe/Kyiv';

// Індекси стовпців
const COL = { id: 0, received: 1, name: 2, phone: 3, message: 4, date: 5, time: 6, status: 7 };

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

function findRowById(sh, id) {
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][COL.id]) === String(id)) return i + 1; // 1-based рядок аркуша
  }
  return -1;
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
      if (String(data[i][COL.date]) === p.date && data[i][COL.status] !== 'Скасовано') {
        taken.push(String(data[i][COL.time]));
      }
    }
    return json({ ok: true, taken: taken });
  }

  if (p.action === 'stats') {
    const rows = [];
    for (let i = 1; i < data.length; i++) {
      const r = data[i];
      rows.push({
        id: String(r[COL.id]),
        received: fmt(r[COL.received]),
        name: r[COL.name], phone: r[COL.phone], message: r[COL.message],
        date: String(r[COL.date]), time: String(r[COL.time]), status: r[COL.status],
      });
    }
    return json({ ok: true, total: rows.length, rows: rows });
  }

  return json({ ok: false, error: 'unknown action' });
}

// POST: { action:"add"|"update"|"delete", ... }
function doPost(e) {
  let body = {};
  try { body = JSON.parse(e.postData.contents); } catch (err) {}
  if (body.secret !== SECRET) return json({ ok: false, error: 'unauthorized' });
  const sh = getSheet();

  if (body.action === 'add') {
    const data = sh.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][COL.date]) === body.date &&
          String(data[i][COL.time]) === body.time &&
          data[i][COL.status] !== 'Скасовано') {
        return json({ ok: false, error: 'taken' });
      }
    }
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    sh.appendRow([id, new Date(), body.name || '', body.phone || '', body.message || '', body.date || '', body.time || '', 'Нова']);
    return json({ ok: true, id: id });
  }

  if (body.action === 'update') {
    const row = findRowById(sh, body.id);
    if (row < 0) return json({ ok: false, error: 'not found' });
    // Оновлюємо ім'я, телефон, повідомлення, дату, час, статус (ID та "Отримано" лишаються)
    sh.getRange(row, COL.name + 1).setValue(body.name || '');
    sh.getRange(row, COL.phone + 1).setValue(body.phone || '');
    sh.getRange(row, COL.message + 1).setValue(body.message || '');
    sh.getRange(row, COL.date + 1).setValue(body.date || '');
    sh.getRange(row, COL.time + 1).setValue(body.time || '');
    sh.getRange(row, COL.status + 1).setValue(body.status || 'Нова');
    return json({ ok: true });
  }

  if (body.action === 'delete') {
    const row = findRowById(sh, body.id);
    if (row < 0) return json({ ok: false, error: 'not found' });
    sh.deleteRow(row);
    return json({ ok: true });
  }

  return json({ ok: false, error: 'unknown action' });
}

function fmt(d) {
  try { return Utilities.formatDate(new Date(d), TZ, 'yyyy-MM-dd HH:mm'); }
  catch (e) { return String(d); }
}

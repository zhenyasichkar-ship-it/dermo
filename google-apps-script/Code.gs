/**
 * Google Apps Script для прийому заявок із сайту дерматолога.
 *
 * НАЛАШТУВАННЯ (2 значення вгорі):
 *   SECRET   — довгий рядок-пароль; такий самий, як SHEETS_SECRET у Vercel.
 *   SHEET_ID — ID вашої Google Таблиці. Візьміть його з адреси таблиці:
 *              https://docs.google.com/spreadsheets/d/⟨ОЦЕ_І_Є_ID⟩/edit
 *
 * РОЗГОРТАННЯ:
 *   Розгорнути → Керувати розгортками → ✏️ →
 *     Виконувати від імені: Я
 *     Хто має доступ: Усі (Anyone)
 *     Версія: Нова → Розгорнути
 *   Скопіюйте URL, що закінчується на /exec → це SHEETS_URL у Vercel.
 */

const SECRET = 'ЗАМІНІТЬ_НА_ДОВГИЙ_СЕКРЕТ_abc123XYZ';
const SHEET_ID = 'ЗАМІНІТЬ_НА_ID_ТАБЛИЦІ';

const SHEET_NAME = 'Заявки';
const HEADERS = ['ID', 'Отримано', 'Ім\'я', 'Телефон', 'Що турбує', 'Дата запису', 'Час', 'Статус'];
const TZ = 'Europe/Kyiv';
const COL = { id: 0, received: 1, name: 2, phone: 3, message: 4, date: 5, time: 6, status: 7 };

function getSheet() {
  const ss = (SHEET_ID && SHEET_ID.indexOf('ЗАМІНІТЬ') < 0)
    ? SpreadsheetApp.openById(SHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Не знайдено таблицю. Вкажіть SHEET_ID угорі скрипта.');
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
    if (String(data[i][COL.id]) === String(id)) return i + 1;
  }
  return -1;
}

function doGet(e) {
  try {
    const p = (e && e.parameter) || {};
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
  } catch (err) {
    return json({ ok: false, error: String(err && err.message || err) });
  }
}

function doPost(e) {
  try {
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
  } catch (err) {
    return json({ ok: false, error: String(err && err.message || err) });
  }
}

function fmt(d) {
  try { return Utilities.formatDate(new Date(d), TZ, 'yyyy-MM-dd HH:mm'); }
  catch (e) { return String(d); }
}

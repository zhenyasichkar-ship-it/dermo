/**
 * Підключення до Postgres через драйвер `pg` (працює з будь-яким Postgres:
 * Neon, Supabase, Vercel Postgres тощо).
 *
 * Змінна оточення додається автоматично, коли ви під'єднуєте базу до
 * проєкту на Vercel: DATABASE_URL (або POSTGRES_URL).
 */

import pg from 'pg';
const { Pool } = pg;

export function dbEnabled() {
  return !!(process.env.DATABASE_URL || process.env.POSTGRES_URL);
}

let pool;
function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
      ssl: { rejectUnauthorized: false },
      max: 1,
      idleTimeoutMillis: 10000,
    });
  }
  return pool;
}

// Виконати запит, повернути масив рядків
export async function q(text, params = []) {
  const res = await getPool().query(text, params);
  return res.rows;
}

// Створює таблицю, якщо її ще немає (ідемпотентно)
export async function ensureTable() {
  await q(`CREATE TABLE IF NOT EXISTS bookings (
    id       TEXT PRIMARY KEY,
    received TIMESTAMPTZ DEFAULT now(),
    name     TEXT,
    phone    TEXT,
    message  TEXT,
    bdate    TEXT,
    btime    TEXT,
    status   TEXT DEFAULT 'Нова'
  )`);
}

/* ============================================================
   Євген Січкар — лікар-дерматолог · логіка лендінгу
   ============================================================ */

// ---------- Мобільне меню ----------
const burger = document.getElementById('burger');
const nav = document.getElementById('nav');

burger.addEventListener('click', () => {
  const open = nav.classList.toggle('is-open');
  burger.classList.toggle('is-open', open);
});

// Закривати меню після кліку по пункту
nav.addEventListener('click', (e) => {
  if (e.target.matches('a')) {
    nav.classList.remove('is-open');
    burger.classList.remove('is-open');
  }
});

// ---------- Поява секцій при скролі ----------
const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

// ---------- Рік у підвалі ----------
document.getElementById('year').textContent = new Date().getFullYear();

// ---------- Легка маска телефону ----------
const phoneInput = document.getElementById('phone');
phoneInput.addEventListener('input', () => {
  // Дозволяємо лише цифри, плюс, дужки, дефіси та пробіли
  phoneInput.value = phoneInput.value.replace(/[^\d+()\-\s]/g, '');
});

// ============================================================
//  Календар запису
// ============================================================
// Розклад дублює api/_config.js — міняти в обох місцях.
const BOOKING = {
  workDays: [1, 2, 3, 4, 5], // Пн–Пт
  startMin: 9 * 60,          // 09:00
  endMin: 19 * 60,           // 19:00
  stepMin: 30,
  horizonDays: 14,
};

const DOW = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const MON = ['січ', 'лют', 'бер', 'кві', 'тра', 'чер', 'лип', 'сер', 'вер', 'жов', 'лис', 'гру'];

const calDays = document.getElementById('calDays');
const calSlots = document.getElementById('calSlots');
const bookingDate = document.getElementById('bookingDate');
const bookingTime = document.getElementById('bookingTime');

function pad(n) { return String(n).padStart(2, '0'); }

function allSlots() {
  const out = [];
  for (let m = BOOKING.startMin; m < BOOKING.endMin; m += BOOKING.stepMin) {
    out.push(`${pad(Math.floor(m / 60))}:${pad(m % 60)}`);
  }
  return out;
}

// Дата й час "зараз" у Києві — незалежно від часового поясу відвідувача
const kyivToday = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Kyiv', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());
const kyivHM = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Kyiv', hour: '2-digit', minute: '2-digit', hour12: false,
}).format(new Date());
const kyivNowMin = Number(kyivHM.slice(0, 2)) * 60 + Number(kyivHM.slice(3, 5));

// Список робочих днів у межах горизонту
function workingDays() {
  const days = [];
  const d = new Date(`${kyivToday}T12:00:00Z`);
  for (let i = 0; i <= BOOKING.horizonDays; i++) {
    if (BOOKING.workDays.includes(d.getUTCDay())) {
      days.push({
        iso: d.toISOString().slice(0, 10),
        dow: DOW[d.getUTCDay()],
        label: `${d.getUTCDate()} ${MON[d.getUTCMonth()]}`,
      });
    }
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return days;
}

function renderDays() {
  const days = workingDays();
  calDays.innerHTML = days.map((d) => `
    <button type="button" class="cal__day" data-date="${d.iso}">
      <span class="cal__dow">${d.dow}</span>
      <span class="cal__date">${d.label}</span>
    </button>`).join('');
}

async function selectDay(btn) {
  document.querySelectorAll('.cal__day').forEach((b) => b.classList.remove('is-active'));
  btn.classList.add('is-active');
  const date = btn.dataset.date;
  bookingDate.value = date;
  bookingTime.value = '';
  calSlots.innerHTML = '<p class="cal__hint">Завантаження…</p>';

  let taken = [];
  try {
    const res = await fetch(`/api/slots?date=${date}`);
    const data = await res.json();
    taken = Array.isArray(data.taken) ? data.taken : [];
  } catch { /* без даних вважаємо все вільним */ }

  const slots = allSlots();
  const html = slots.map((t) => {
    const min = Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
    const isPast = date === kyivToday && min <= kyivNowMin;
    const disabled = taken.includes(t) || isPast;
    return `<button type="button" class="cal__slot" data-time="${t}"${disabled ? ' disabled' : ''}>${t}</button>`;
  }).join('');
  calSlots.innerHTML = html || '<p class="cal__hint">Немає вільних годин.</p>';

  if (slots.every((t) => {
    const min = Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
    return taken.includes(t) || (date === kyivToday && min <= kyivNowMin);
  })) {
    calSlots.innerHTML = '<p class="cal__hint">На цей день вільних годин немає — оберіть інший.</p>';
  }
}

function selectSlot(btn) {
  document.querySelectorAll('.cal__slot').forEach((b) => b.classList.remove('is-active'));
  btn.classList.add('is-active');
  bookingTime.value = btn.dataset.time;
}

if (calDays) {
  renderDays();
  calDays.addEventListener('click', (e) => {
    const btn = e.target.closest('.cal__day');
    if (btn) selectDay(btn);
  });
  calSlots.addEventListener('click', (e) => {
    const btn = e.target.closest('.cal__slot');
    if (btn && !btn.disabled) selectSlot(btn);
  });
}

// ============================================================
//  Відправлення форми
// ============================================================
const form = document.getElementById('bookingForm');
const statusEl = document.getElementById('formStatus');
const submitBtn = document.getElementById('submitBtn');

function setStatus(text, type) {
  statusEl.textContent = text;
  statusEl.className = 'form__status' + (type ? ' ' + type : '');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = form.name.value.trim();
  const phone = form.phone.value.trim();
  const message = form.message.value.trim();
  const honeypot = form.website.value;
  const date = bookingDate.value;
  const time = bookingTime.value;

  if (!date || !time) {
    setStatus('Оберіть, будь ласка, день і час запису вгорі.', 'err');
    return;
  }

  form.name.classList.toggle('is-invalid', !name);
  const phoneOk = phone.replace(/\D/g, '').length >= 10;
  form.phone.classList.toggle('is-invalid', !phoneOk);
  if (!name || !phoneOk) {
    setStatus('Будь ласка, вкажіть ім\'я та коректний номер телефону.', 'err');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Записуємо…';
  setStatus('');

  try {
    const res = await fetch('/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, message, date, time, website: honeypot }),
    });
    const data = await res.json().catch(() => ({}));

    if (res.ok && data.ok) {
      form.reset();
      bookingDate.value = '';
      bookingTime.value = '';
      document.querySelectorAll('.cal__day, .cal__slot').forEach((b) => b.classList.remove('is-active'));
      calSlots.innerHTML = '<p class="cal__hint">Спочатку оберіть день ↑</p>';
      setStatus('✅ Дякую! Вас записано — я зв\'яжуся для підтвердження.', 'ok');
    } else if (res.status === 409) {
      // час щойно зайняли — оновимо сітку
      setStatus(data.error || 'Цей час уже зайнятий, оберіть інший.', 'err');
      const active = document.querySelector('.cal__day.is-active');
      if (active) selectDay(active);
    } else {
      throw new Error(data.error || 'Помилка сервера');
    }
  } catch (err) {
    setStatus('😔 Не вдалося записати. Спробуйте ще раз або зателефонуйте: 067 666 14 88.', 'err');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Записатися на прийом';
  }
});

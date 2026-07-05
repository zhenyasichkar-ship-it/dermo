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

// ---------- Відправлення форми в Telegram ----------
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
  const honeypot = form.website.value; // боти заповнюють приховане поле

  // Валідація
  form.name.classList.toggle('is-invalid', !name);
  const phoneDigits = phone.replace(/\D/g, '');
  const phoneOk = phoneDigits.length >= 10;
  form.phone.classList.toggle('is-invalid', !phoneOk);

  if (!name || !phoneOk) {
    setStatus('Будь ласка, вкажіть ім\'я та коректний номер телефону.', 'err');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Надсилаємо…';
  setStatus('');

  try {
    const res = await fetch('/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, message, website: honeypot }),
    });
    const data = await res.json().catch(() => ({}));

    if (res.ok && data.ok) {
      form.reset();
      setStatus('✅ Дякую! Заявку отримано — я зв\'яжуся з вами найближчим часом.', 'ok');
    } else {
      throw new Error(data.error || 'Помилка сервера');
    }
  } catch (err) {
    setStatus('😔 Не вдалося надіслати. Спробуйте ще раз або зателефонуйте: 067 666 14 88.', 'err');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Надіслати заявку';
  }
});

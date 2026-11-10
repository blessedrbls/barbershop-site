/* =========================================================
   Barber Studio — логіка сайту (чистий JavaScript, без бібліотек)
   ========================================================= */

/* ---------- НАЛАШТУВАННЯ: міняйте тут ---------- */

// Посилання на Telegram-бота для запису.
// Його використовують усі кнопки з класом "js-telegram-link" (головний екран,
// блок «Послуги», блок заявки, іконка в підвалі). Поміняйте тут — зміниться всюди.
const TELEGRAM_BOT_URL = "https://t.me/barbershop_barbershop_bot_bot";

// Адреса вашого Cloudflare Worker, який пересилає заявки з форми в Telegram-групу адміністраторів.
// Виглядає так: "https://barber-booking.ваш-нік.workers.dev"
// Як його створити — покроково в telegram-worker/SETUP.md
// Ця адреса НЕ секретна, її можна тримати в коді. Секретний токен бота
// зберігається тільки в налаштуваннях Worker'а на Cloudflare — НІКОЛИ не вставляйте його сюди.
// Поки адреса порожня, форма працює в демо-режимі: показує «Дякуємо», але нічого не надсилає.
const BOOKING_ENDPOINT = "https://barber-booking.aleksstarichenko.workers.dev";

const DEFAULT_LANG = "uk";


/* ---------- СЛОВНИК ПЕРЕКЛАДІВ ----------
   Ключ (наприклад "nav.services") збігається з атрибутом data-i18n="nav.services" в index.html.
   Щоб додати новий текст: додайте data-i18n="мій.ключ" в HTML і рядок з цим ключем у обидві мови. */
const translations = {
  uk: {
    "meta.title": "Barber Studio — барбершоп у Києві",

    "nav.services": "Послуги",
    "nav.masters": "Майстри",
    "nav.gallery": "Галерея",
    "nav.reviews": "Відгуки",
    "nav.contacts": "Контакти",
    "header.cta": "Записатися",

    "hero.eyebrow": "Барбершоп у центрі Києва",
    "hero.title1": "Стиль, що",
    "hero.title2": "говорить за тебе",
    "hero.text": "Чоловічі стрижки, догляд за бородою та гоління від майстрів, які знають свою справу.",
    "hero.cta": "Записатися онлайн",
    "cta.telegram": "Записатися через Telegram",

    "services.eyebrow": "Прайс",
    "services.title": "Послуги та ціни",
    "services.haircut": "Стрижка",
    "services.haircutText": "Консультація, миття голови, стрижка та укладка.",
    "services.beard": "Борода",
    "services.beardText": "Моделювання бороди, гарячий рушник та догляд олією.",
    "services.combo": "Стрижка + борода",
    "services.comboText": "Повний образ: стрижка, укладка та оформлення бороди.",
    "services.kids": "Дитяча стрижка",
    "services.kidsText": "Для хлопців до 12 років — спокійно, швидко й акуратно.",
    "services.popular": "Хіт",
    "services.ctaText": "Обрали послугу? Запишіться за хвилину в нашому Telegram-боті.",
    "services.ctaForm": "Немає Telegram? Залиште заявку →",
    "unit.min": "хв",
    "unit.uah": "грн",

    "masters.eyebrow": "Команда",
    "masters.title": "Наші майстри",
    "masters.m1.name": "Олександр Коваль",
    "masters.m1.exp": "Досвід 8 років",
    "masters.m1.spec": "Класичні стрижки та фейди",
    "masters.m1.alt": "Майстер Олександр",
    "masters.m2.name": "Дмитро Шевченко",
    "masters.m2.exp": "Досвід 5 років",
    "masters.m2.spec": "Сучасні укладки та текстуровані стрижки",
    "masters.m2.alt": "Майстер Дмитро",
    "masters.m3.name": "Андрій Бондар",
    "masters.m3.exp": "Досвід 6 років",
    "masters.m3.spec": "Борода та гоління небезпечною бритвою",
    "masters.m3.alt": "Майстер Андрій",

    "gallery.eyebrow": "Портфоліо",
    "gallery.title": "Наші роботи",
    "gallery.alt1": "Стрижка ножицями",
    "gallery.alt2": "Окантовка небезпечною бритвою",
    "gallery.alt3": "Оформлення бороди",
    "gallery.alt4": "Укладка феном",
    "gallery.alt5": "Філірування волосся",
    "gallery.alt6": "Чоловіча стрижка з переходом",

    "reviews.eyebrow": "Що кажуть клієнти",
    "reviews.title": "Відгуки",
    "reviews.r1.text": "Ходжу до Олександра вже рік — жодного разу не пошкодував. Фейд ідеальний, атмосфера як у хорошому клубі.",
    "reviews.r1.name": "Максим",
    "reviews.r1.service": "Стрижка",
    "reviews.r2.text": "Нарешті знайшов майстра, який розуміє, що я хочу з бородою. Гарячий рушник — окремий кайф.",
    "reviews.r2.name": "Ігор",
    "reviews.r2.service": "Стрижка + борода",
    "reviews.r3.text": "Привів сина на першу стрижку — майстер знайшов підхід, син у захваті. Записався зручно через Telegram.",
    "reviews.r3.name": "Олена",
    "reviews.r3.service": "Дитяча стрижка",

    "contacts.eyebrow": "Як нас знайти",
    "contacts.title": "Контакти",
    "contacts.branch1": "Філіал на Хрещатику",
    "contacts.address1": "вул. Хрещатик, 22",
    "contacts.branch2": "Філіал на Гончара",
    "contacts.address2": "вул. Гончара, 15",
    "contacts.hoursTitle": "Графік роботи",
    "contacts.weekdays": "Пн–Пт",
    "contacts.weekend": "Сб–Нд",
    "contacts.phoneTitle": "Телефон",

    "booking.eyebrow": "Онлайн-запис",
    "booking.title": "Оберіть зручний час",
    "booking.text": "Оберіть послугу, майстра, день і час. Адміністратор зателефонує, щоб підтвердити запис.",
    "booking.alt": "Швидше через Telegram:",
    "booking.altLink": "відкрити бота →",

    "form.name": "Імʼя *",
    "form.namePh": "Ваше імʼя",
    "form.phone": "Телефон *",
    "form.service": "Послуга",
    "form.opt.haircut": "Стрижка — 500 грн",
    "form.opt.beard": "Борода — 300 грн",
    "form.opt.combo": "Стрижка + борода — 750 грн",
    "form.opt.kids": "Дитяча стрижка — 400 грн",
    "form.master": "Майстер",
    "form.master.any": "Будь-який майстер",
    "form.branch": "Філіал",
    "form.date": "Дата *",
    "form.time": "Час *",
    "form.today": "Сьогодні",
    "form.tomorrow": "Завтра",
    "form.pickDate": "Спочатку оберіть дату",
    "form.noSlots": "На цей день вільного часу вже немає — оберіть інший",
    "form.errDate": "Оберіть дату",
    "form.errTime": "Оберіть час",
    "form.errTaken": "Цей час щойно зайняли — будь ласка, оберіть інший",
    "form.dayFull": "Усе зайнято",
    "form.onlyFree": "Показано лише вільний час. Зайняті години приховано.",
    "form.masterBusy": "На цей день у майстра немає вільного часу — оберіть інший день або іншого майстра",
    "form.submit": "Надіслати заявку",
    "form.sending": "Надсилаємо…",
    "form.errName": "Будь ласка, вкажіть імʼя",
    "form.errPhone": "Будь ласка, вкажіть телефон",
    "form.errPhoneShort": "Перевірте номер: потрібно щонайменше 10 цифр",
    "form.success": "Дякуємо! Ми скоро зателефонуємо",
    "form.error": "Не вдалося надіслати заявку. Спробуйте ще раз або запишіться через Telegram.",

    "footer.rights": "Усі права захищені.",
    "footer.demo": "Демо-проєкт: барбершоп вигаданий.",
    "footer.author": "Сайт розробив",

    "aria.menuOpen": "Відкрити меню",
    "aria.menuClose": "Закрити меню",
    "aria.close": "Закрити",
    "aria.prev": "Попереднє фото",
    "aria.next": "Наступне фото",
    "aria.scroll": "Гортати вниз",
    "aria.map": "Карта: Barber Studio"
  },

  en: {
    "meta.title": "Barber Studio — barbershop in Kyiv",

    "nav.services": "Services",
    "nav.masters": "Barbers",
    "nav.gallery": "Gallery",
    "nav.reviews": "Reviews",
    "nav.contacts": "Contacts",
    "header.cta": "Book now",

    "hero.eyebrow": "Barbershop in the heart of Kyiv",
    "hero.title1": "A style that",
    "hero.title2": "speaks for you",
    "hero.text": "Men's haircuts, beard care and shaves by barbers who truly know their craft.",
    "hero.cta": "Book online",
    "cta.telegram": "Book via Telegram",

    "services.eyebrow": "Price list",
    "services.title": "Services & prices",
    "services.haircut": "Haircut",
    "services.haircutText": "Consultation, hair wash, haircut and styling.",
    "services.beard": "Beard",
    "services.beardText": "Beard shaping, hot towel and beard oil care.",
    "services.combo": "Haircut + beard",
    "services.comboText": "The full look: haircut, styling and beard grooming.",
    "services.kids": "Kids' haircut",
    "services.kidsText": "For boys under 12 — calm, quick and neat.",
    "services.popular": "Best seller",
    "services.ctaText": "Picked a service? Book in a minute with our Telegram bot.",
    "services.ctaForm": "No Telegram? Leave a request →",
    "unit.min": "min",
    "unit.uah": "UAH",

    "masters.eyebrow": "Our team",
    "masters.title": "Our barbers",
    "masters.m1.name": "Oleksandr Koval",
    "masters.m1.exp": "8 years of experience",
    "masters.m1.spec": "Classic cuts and fades",
    "masters.m1.alt": "Barber Oleksandr",
    "masters.m2.name": "Dmytro Shevchenko",
    "masters.m2.exp": "5 years of experience",
    "masters.m2.spec": "Modern styling and textured cuts",
    "masters.m2.alt": "Barber Dmytro",
    "masters.m3.name": "Andrii Bondar",
    "masters.m3.exp": "6 years of experience",
    "masters.m3.spec": "Beards and straight razor shaves",
    "masters.m3.alt": "Barber Andrii",

    "gallery.eyebrow": "Portfolio",
    "gallery.title": "Our work",
    "gallery.alt1": "Scissor haircut",
    "gallery.alt2": "Straight razor line-up",
    "gallery.alt3": "Beard grooming",
    "gallery.alt4": "Blow-dry styling",
    "gallery.alt5": "Hair thinning with shears",
    "gallery.alt6": "Men's fade haircut",

    "reviews.eyebrow": "What clients say",
    "reviews.title": "Reviews",
    "reviews.r1.text": "I've been going to Oleksandr for a year now and never regretted it. Perfect fade, and the vibe is like a good club.",
    "reviews.r1.name": "Maksym",
    "reviews.r1.service": "Haircut",
    "reviews.r2.text": "Finally found a barber who gets what I want with my beard. The hot towel is a treat on its own.",
    "reviews.r2.name": "Ihor",
    "reviews.r2.service": "Haircut + beard",
    "reviews.r3.text": "Brought my son for his first haircut — the barber found the right approach and he loved it. Booking via Telegram was easy.",
    "reviews.r3.name": "Olena",
    "reviews.r3.service": "Kids' haircut",

    "contacts.eyebrow": "How to find us",
    "contacts.title": "Contacts",
    "contacts.branch1": "Khreshchatyk branch",
    "contacts.address1": "22 Khreshchatyk St",
    "contacts.branch2": "Honchara branch",
    "contacts.address2": "15 Honchara St",
    "contacts.hoursTitle": "Opening hours",
    "contacts.weekdays": "Mon–Fri",
    "contacts.weekend": "Sat–Sun",
    "contacts.phoneTitle": "Phone",

    "booking.eyebrow": "Online booking",
    "booking.title": "Pick a time that suits you",
    "booking.text": "Choose a service, barber, day and time. Our administrator will call you to confirm the booking.",
    "booking.alt": "Faster via Telegram:",
    "booking.altLink": "open the bot →",

    "form.name": "Name *",
    "form.namePh": "Your name",
    "form.phone": "Phone *",
    "form.service": "Service",
    "form.opt.haircut": "Haircut — 500 UAH",
    "form.opt.beard": "Beard — 300 UAH",
    "form.opt.combo": "Haircut + beard — 750 UAH",
    "form.opt.kids": "Kids' haircut — 400 UAH",
    "form.master": "Barber",
    "form.master.any": "Any barber",
    "form.branch": "Location",
    "form.date": "Date *",
    "form.time": "Time *",
    "form.today": "Today",
    "form.tomorrow": "Tomorrow",
    "form.pickDate": "Pick a date first",
    "form.noSlots": "No free time left on this day — please pick another",
    "form.errDate": "Please choose a date",
    "form.errTime": "Please choose a time",
    "form.errTaken": "That time was just booked by someone else — please pick another",
    "form.dayFull": "Fully booked",
    "form.onlyFree": "Only free times are shown. Booked hours are hidden.",
    "form.masterBusy": "This barber has no free time on this day — pick another day or barber",
    "form.submit": "Send request",
    "form.sending": "Sending…",
    "form.errName": "Please enter your name",
    "form.errPhone": "Please enter your phone number",
    "form.errPhoneShort": "Check the number: at least 10 digits are needed",
    "form.success": "Thank you! We'll call you soon",
    "form.error": "Couldn't send your request. Please try again or book via Telegram.",

    "footer.rights": "All rights reserved.",
    "footer.demo": "Demo project: the barbershop is fictional.",
    "footer.author": "Website by",

    "aria.menuOpen": "Open menu",
    "aria.menuClose": "Close menu",
    "aria.close": "Close",
    "aria.prev": "Previous photo",
    "aria.next": "Next photo",
    "aria.scroll": "Scroll down",
    "aria.map": "Map: Barber Studio"
  }
};


/* ---------- ПЕРЕКЛАД СТОРІНКИ ---------- */

let currentLang = DEFAULT_LANG;

// Повертає текст за ключем для поточної мови
function t(key) {
  return translations[currentLang][key] || translations[DEFAULT_LANG][key] || key;
}

function setLanguage(lang) {
  if (!translations[lang]) lang = DEFAULT_LANG;
  currentLang = lang;

  document.documentElement.lang = lang;   // <html lang="uk"> або "en"
  document.title = t("meta.title");

  // Звичайний текст: <span data-i18n="ключ">
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  // Підказки в полях: placeholder
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  // Опис картинок: alt
  document.querySelectorAll("[data-i18n-alt]").forEach((el) => {
    el.alt = t(el.dataset.i18nAlt);
  });
  // Підписи для екранних читалок: aria-label
  document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    el.setAttribute("aria-label", t(el.dataset.i18nAria));
  });

  // Підсвічуємо активну кнопку UA / EN
  document.querySelectorAll(".lang-switch__btn").forEach((btn) => {
    const isActive = btn.dataset.lang === lang;
    btn.classList.toggle("is-active", isActive);
    btn.setAttribute("aria-pressed", isActive);
  });

  // Карта Google — теж на обраній мові
  updateMap();

  // Назви днів тижня в записі («Чт» / «Thu») — теж перемальовуємо
  renderDates();

  // Запамʼятовуємо вибір (try/catch — бо в приватному режимі localStorage може не працювати)
  try {
    localStorage.setItem("lang", lang);
  } catch (e) {
    /* не страшно — просто не запамʼятаємо */
  }
}

document.querySelectorAll(".lang-switch__btn").forEach((btn) => {
  btn.addEventListener("click", () => setLanguage(btn.dataset.lang));
});


/* ---------- TELEGRAM ---------- */

// Ставимо посилання на бота в усі кнопки з класом js-telegram-link
document.querySelectorAll(".js-telegram-link").forEach((link) => {
  link.href = TELEGRAM_BOT_URL;
});


/* ---------- ШАПКА ТА МОБІЛЬНЕ МЕНЮ ---------- */

const header = document.getElementById("header");
const burger = document.getElementById("burger");

// Коли прокрутили сторінку — шапка отримує темний фон
function onScroll() {
  header.classList.toggle("is-scrolled", window.scrollY > 40);
}
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

function toggleMenu(open) {
  header.classList.toggle("nav-open", open);
  document.body.classList.toggle("no-scroll", open);
  burger.setAttribute("aria-expanded", open);
  burger.dataset.i18nAria = open ? "aria.menuClose" : "aria.menuOpen";
  burger.setAttribute("aria-label", t(burger.dataset.i18nAria));
}

burger.addEventListener("click", () => {
  toggleMenu(!header.classList.contains("nav-open"));
});

// Після кліку по пункту меню — закриваємо його
document.querySelectorAll(".nav__link").forEach((link) => {
  link.addEventListener("click", () => toggleMenu(false));
});

// Якщо екран розширили (наприклад, повернули планшет) — закриваємо мобільне меню
window.addEventListener("resize", () => {
  if (window.innerWidth > 960) toggleMenu(false);
});


/* ---------- АНІМАЦІЯ ПОЯВИ БЛОКІВ ----------
   IntersectionObserver «стежить» за елементами й повідомляє, коли вони з'являються на екрані. */

const revealItems = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);   // анімуємо лише один раз
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );

  revealItems.forEach((el, i) => {
    // Невелика затримка для сусідніх карток — вони з'являються «хвилею»
    el.style.transitionDelay = `${(i % 4) * 80}ms`;
    observer.observe(el);
  });
} else {
  revealItems.forEach((el) => el.classList.add("is-visible"));
}


/* ---------- ГАЛЕРЕЯ: ПЕРЕГЛЯД ФОТО (LIGHTBOX) ---------- */

const galleryItems = Array.from(document.querySelectorAll(".gallery__item"));
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");
let currentIndex = 0;

function showPhoto(index) {
  // % — щоб після останнього фото йшло перше, і навпаки
  currentIndex = (index + galleryItems.length) % galleryItems.length;
  const item = galleryItems[currentIndex];
  lightboxImg.src = item.dataset.full;
  lightboxImg.alt = item.querySelector("img").alt;
}

function openLightbox(index) {
  showPhoto(index);
  lightbox.showModal();
  document.body.classList.add("no-scroll");
}

function closeLightbox() {
  lightbox.close();
}

galleryItems.forEach((item, index) => {
  item.addEventListener("click", () => openLightbox(index));
});

lightbox.addEventListener("click", (event) => {
  const action = event.target.dataset.action;
  if (action === "close") closeLightbox();
  if (action === "prev") showPhoto(currentIndex - 1);
  if (action === "next") showPhoto(currentIndex + 1);
  // Клік по темному фону (не по фото і не по кнопці) — закрити
  if (event.target === lightbox) closeLightbox();
});

// Стрілки на клавіатурі. Esc закриває <dialog> автоматично.
lightbox.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") showPhoto(currentIndex - 1);
  if (event.key === "ArrowRight") showPhoto(currentIndex + 1);
});

lightbox.addEventListener("close", () => {
  document.body.classList.remove("no-scroll");
});


/* ---------- КОНТАКТИ: ПЕРЕМИКАННЯ КАРТИ МІЖ ФІЛІАЛАМИ ---------- */

const branches = document.querySelectorAll(".branch");
const map = document.getElementById("map");

function updateMap() {
  const active = document.querySelector(".branch.is-active");
  if (!active || !map) return;
  const query = encodeURIComponent(active.dataset.map);
  const hl = currentLang === "uk" ? "uk" : "en";
  const newSrc = `https://maps.google.com/maps?q=${query}&z=16&hl=${hl}&output=embed`;
  if (map.src !== newSrc) map.src = newSrc;
  map.title = t("aria.map");
}

branches.forEach((branch) => {
  branch.addEventListener("click", () => {
    branches.forEach((b) => {
      b.classList.remove("is-active");
      b.setAttribute("aria-pressed", "false");
    });
    branch.classList.add("is-active");
    branch.setAttribute("aria-pressed", "true");
    updateMap();
  });
});


/* ---------- ФОРМА ЗАЯВКИ ---------- */

const form = document.getElementById("booking-form");
const nameInput = document.getElementById("name");
const phoneInput = document.getElementById("phone");
const serviceSelect = document.getElementById("service");
const datePicker = document.getElementById("date-picker");
const timePicker = document.getElementById("time-picker");
const dateError = document.getElementById("date-error");
const timeError = document.getElementById("time-error");
const statusEl = document.getElementById("form-status");
const submitBtn = form.querySelector(".form__submit");


/* ---------- ВИБІР ДНЯ ТА ЧАСУ ---------- */

// Графік роботи (години відкриття і закриття). Має збігатися з блоком «Контакти» і з worker.js.
const WORKING_HOURS = {
  weekday: [9, 21],   // Пн–Пт 09:00–21:00
  weekend: [10, 19]   // Сб–Нд 10:00–19:00
};
const DAYS_AHEAD = 14;          // на скільки днів уперед можна записатися
const MIN_LEAD_MINUTES = 60;    // на сьогодні — не раніше ніж за годину від поточного часу

// Зайняті години з бази. Їх віддає Worker за адресою /availability:
//   { "2026-11-12": { "19": ["dmytro"], "20": ["dmytro"] } }  — дата → година → зайняті майстри
// null — ще не завантажено (або демо-режим): тоді всі години показуємо вільними,
// а Worker однаково перевірить зайнятість у момент запису.
let busySlots = null;
let busyLoadedAt = 0;

const masterSelect = document.getElementById("master");
// Коди майстрів зі списку, крім «Будь-який»: ["oleksandr", "dmytro", "andrii"]
const MASTER_IDS = Array.from(masterSelect.options)
  .map((option) => option.value)
  .filter((value) => value !== "any");

// Значення обраного radio з певним name, або "" якщо нічого не обрано
function checkedValue(name) {
  const input = form.querySelector(`input[name="${name}"]:checked`);
  return input ? input.value : "";
}

// Поточні дата і час саме в Києві — навіть якщо відвідувач в іншому часовому поясі
function kyivNow() {
  const parts = {};
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Kyiv",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(new Date()).forEach((p) => { parts[p.type] = p.value; });

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    minutes: Number(parts.hour) * 60 + Number(parts.minute)   // хвилин від початку доби
  };
}

// Дату зберігаємо як "2026-11-12". Працюємо в UTC, щоб не заважали часові пояси.
function toISODate(date) {
  return date.toISOString().slice(0, 10);
}

function serviceDuration() {
  return Number(serviceSelect.selectedOptions[0].dataset.duration) || 60;
}

function formatHour(hour) {
  return `${String(hour).padStart(2, "0")}:00`;
}

// Які години займає послуга: 30–60 хв → одна година, 90 хв о 19:00 → [19, 20]
function hoursNeeded(hour) {
  return Array.from({ length: Math.ceil(serviceDuration() / 60) }, (_, i) => hour + i);
}

// Чи вільний конкретний майстер на всі потрібні години
function isMasterFree(iso, hour, master) {
  const day = busySlots && busySlots[iso];
  if (!day) return true;
  return hoursNeeded(hour).every((h) => !(day[h] || []).includes(master));
}

// Чи можна записатися на цю годину: до обраного майстра або, якщо «Будь-який», хоча б до одного
function isSlotFree(iso, hour) {
  const master = masterSelect.value;
  if (master === "any") return MASTER_IDS.some((m) => isMasterFree(iso, hour, m));
  return isMasterFree(iso, hour, master);
}

// Робочі години на конкретний день: [10, 11, 12, ...]
// Остання година — та, після якої послуга встигає закінчитися до закриття.
function slotsFor(date, isToday, nowMinutes) {
  const dayOfWeek = date.getUTCDay();   // 0 — неділя, 6 — субота
  const [open, close] = (dayOfWeek === 0 || dayOfWeek === 6) ? WORKING_HOURS.weekend : WORKING_HOURS.weekday;
  const hours = [];

  for (let hour = open; hour * 60 + serviceDuration() <= close * 60; hour++) {
    if (isToday && hour * 60 < nowMinutes + MIN_LEAD_MINUTES) continue;   // цей час уже минув
    hours.push(hour);
  }
  return hours;
}

// Малює кнопки днів: «Сьогодні 10.11», «Завтра 11.11», «Чт 12.11» ...
// День, де все зайнято, показуємо закресленим і обрати його не можна.
function renderDates() {
  const selected = checkedValue("date");
  const now = kyivNow();
  const weekdayFormat = new Intl.DateTimeFormat(currentLang === "uk" ? "uk-UA" : "en-GB", {
    weekday: "short",
    timeZone: "UTC"
  });

  let html = "";
  let selectedBecameFull = false;   // обраний день став повністю зайнятим (наприклад, змінили майстра)
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const date = new Date(Date.UTC(now.year, now.month - 1, now.day + i));
    const hours = slotsFor(date, i === 0, now.minutes);
    // Якщо сьогодні вже нічого не встигаємо — сьогоднішній день не показуємо
    if (i === 0 && hours.length === 0) continue;

    const iso = toISODate(date);
    const isFull = hours.every((hour) => !isSlotFree(iso, hour));
    if (isFull && iso === selected) selectedBecameFull = true;
    const weekday = i === 0 ? t("form.today") : i === 1 ? t("form.tomorrow") : weekdayFormat.format(date);
    const dayMonth = `${String(date.getUTCDate()).padStart(2, "0")}.${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

    html += `
      <input type="radio" class="visually-hidden" name="date" id="date-${iso}" value="${iso}"${isFull ? " disabled" : ""}${iso === selected && !isFull ? " checked" : ""}>
      <label for="date-${iso}" class="choice"${isFull ? ` title="${t("form.dayFull")}"` : ""}>
        <span class="choice__weekday">${weekday}</span>
        <span class="choice__day">${dayMonth}</span>
      </label>`;
  }
  datePicker.innerHTML = html;
  renderTimes(selectedBecameFull);
}

// Малює кнопки годин для обраного дня — тільки вільні.
// dayBecameFull = true — обраний день щойно став недоступним (у цього майстра все зайнято).
function renderTimes(dayBecameFull = false) {
  const selectedDate = checkedValue("date");
  const selectedTime = checkedValue("time");

  if (!selectedDate) {
    const key = dayBecameFull ? "form.masterBusy" : "form.pickDate";
    timePicker.innerHTML = `<p class="time-picker__empty" data-i18n="${key}">${t(key)}</p>`;
    return;
  }

  const now = kyivNow();
  const date = new Date(`${selectedDate}T00:00:00Z`);
  const isToday = selectedDate === toISODate(new Date(Date.UTC(now.year, now.month - 1, now.day)));
  const hours = slotsFor(date, isToday, now.minutes);

  if (hours.length === 0) {
    timePicker.innerHTML = `<p class="time-picker__empty" data-i18n="form.noSlots">${t("form.noSlots")}</p>`;
    return;
  }

  // Показуємо лише вільні години обраного майстра (або «будь-якого» — якщо вільний хоч один)
  const freeHours = hours.filter((hour) => isSlotFree(selectedDate, hour));

  if (freeHours.length === 0) {
    timePicker.innerHTML = `<p class="time-picker__empty" data-i18n="form.masterBusy">${t("form.masterBusy")}</p>`;
    return;
  }

  const chips = freeHours.map((hour) => {
    const time = formatHour(hour);
    const id = `time-${time.replace(":", "")}`;
    return `
      <input type="radio" class="visually-hidden" name="time" id="${id}" value="${time}"${time === selectedTime ? " checked" : ""}>
      <label for="${id}" class="choice">${time}</label>`;
  }).join("");

  // Якщо частину годин сховали — підказуємо, що це не помилка
  const someHidden = freeHours.length < hours.length;
  timePicker.innerHTML = chips +
    (someHidden ? `<p class="time-picker__hint" data-i18n="form.onlyFree">${t("form.onlyFree")}</p>` : "");
}

// Завантажує зайнятий час з Worker'а і перемальовує дні та години.
// force = false — не частіше ніж раз на 30 секунд.
async function loadAvailability(force = false) {
  if (!BOOKING_ENDPOINT) return;   // демо-режим — бази немає
  if (!force && Date.now() - busyLoadedAt < 30000) return;
  busyLoadedAt = Date.now();

  try {
    const response = await fetch(`${BOOKING_ENDPOINT.replace(/\/$/, "")}/availability`, { cache: "no-store" });
    const result = await response.json();
    if (result.ok) {
      busySlots = result.busy;
      renderDates();
    }
  } catch (error) {
    // Не страшно: години покажемо як вільні, а Worker перевірить зайнятість під час запису
    console.warn("Не вдалося завантажити зайнятий час:", error);
  }
}

// Обрали день → перемальовуємо години. Змінили послугу чи майстра → перемальовуємо все.
datePicker.addEventListener("change", (event) => {
  showMessage(dateError, null);
  renderTimes(false);
  // Якщо день обрали стрілками на клавіатурі — прокручуємо рядок дат до нього
  const label = datePicker.querySelector(`label[for="${event.target.id}"]`);
  if (label) label.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  loadAvailability();   // оновлюємо зайнятість, якщо дані старші за 30 секунд
});
timePicker.addEventListener("change", () => showMessage(timeError, null));
serviceSelect.addEventListener("change", renderDates);
masterSelect.addEventListener("change", renderDates);
// Людина почала заповнювати форму — свіжо підтягуємо зайнятість
form.addEventListener("focusin", () => loadAvailability());

function setFieldError(input, messageKey) {
  const errorEl = document.getElementById(`${input.id}-error`);
  input.classList.toggle("is-invalid", Boolean(messageKey));
  input.setAttribute("aria-invalid", Boolean(messageKey));
  showMessage(errorEl, messageKey);
}

// Показує текст за ключем і запамʼятовує ключ у data-i18n —
// тоді при перемиканні мови setLanguage() сам перекладе і це повідомлення
function showMessage(el, messageKey) {
  if (messageKey) {
    el.dataset.i18n = messageKey;
    el.textContent = t(messageKey);
  } else {
    delete el.dataset.i18n;
    el.textContent = "";
  }
}

// Перевіряє поля. Повертає перший елемент з помилкою (щоб на нього перейти) або null, якщо все гаразд.
function validateForm() {
  let firstInvalid = null;

  const name = nameInput.value.trim();
  if (name === "") {
    setFieldError(nameInput, "form.errName");
    firstInvalid = firstInvalid || nameInput;
  } else {
    setFieldError(nameInput, null);
  }

  const phone = phoneInput.value.trim();
  const digits = phone.replace(/\D/g, "");   // лишаємо тільки цифри
  if (phone === "") {
    setFieldError(phoneInput, "form.errPhone");
    firstInvalid = firstInvalid || phoneInput;
  } else if (digits.length < 10) {
    setFieldError(phoneInput, "form.errPhoneShort");
    firstInvalid = firstInvalid || phoneInput;
  } else {
    setFieldError(phoneInput, null);
  }

  if (!checkedValue("date")) {
    showMessage(dateError, "form.errDate");
    firstInvalid = firstInvalid || datePicker.querySelector("input");
  } else {
    showMessage(dateError, null);
  }

  if (!checkedValue("time")) {
    showMessage(timeError, "form.errTime");
    firstInvalid = firstInvalid || timePicker.querySelector("input") || datePicker.querySelector("input");
  } else {
    showMessage(timeError, null);
  }

  return firstInvalid;
}

// Прибираємо помилку, щойно людина почала виправляти поле
[nameInput, phoneInput].forEach((input) => {
  input.addEventListener("input", () => {
    if (input.classList.contains("is-invalid")) setFieldError(input, null);
  });
});

function showStatus(messageKey, type) {
  showMessage(statusEl, messageKey);
  statusEl.className = `form__status${type ? ` is-${type}` : ""}`;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();   // не даємо браузеру перезавантажити сторінку
  showStatus(null);

  const firstInvalid = validateForm();
  if (firstInvalid) {
    firstInvalid.focus();
    firstInvalid.closest(".form__field").scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  // { name, phone, service, master, branch, date, time, botcheck? }
  const data = Object.fromEntries(new FormData(form));

  // Спам-бот заповнив приховане поле — тихо ігноруємо
  if (data.botcheck) return;

  submitBtn.disabled = true;
  submitBtn.dataset.i18n = "form.sending";
  submitBtn.textContent = t("form.sending");

  try {
    if (!BOOKING_ENDPOINT) {
      // Демо-режим: адресу Worker'а ще не вказано, тому просто імітуємо відправку
      console.info("BOOKING_ENDPOINT не вказано, заявка НЕ надіслана (демо-режим).", data);
      await new Promise((resolve) => setTimeout(resolve, 700));
    } else {
      // Надсилаємо заявку Worker'у, а він пересилає її в Telegram
      const response = await fetch(BOOKING_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          phone: data.phone,
          service: data.service,   // код послуги: haircut, beard, combo, kids
          master: data.master,     // any, oleksandr, dmytro, andrii
          branch: data.branch,     // khreshchatyk, honchara
          date: data.date,         // "2026-11-12"
          time: data.time,         // "14:00"
          lang: currentLang
        })
      });
      const result = await response.json();

      if (response.status === 409) {
        // Поки людина заповнювала форму, цей час хтось устиг зайняти.
        // Оновлюємо зайнятість — обраний час стане закресленим, і можна обрати інший.
        showStatus("form.errTaken", "error");
        await loadAvailability(true);
        timePicker.scrollIntoView({ behavior: "smooth", block: "center" });
        return;   // finally нижче все одно виконається і поверне кнопку
      }
      if (!result.ok) throw new Error(result.error);
    }

    showStatus("form.success", "success");
    form.reset();
    datePicker.innerHTML = "";   // скидаємо обраний день і час
    renderDates();
    loadAvailability(true);      // щойно зайнятий час одразу стане закресленим
  } catch (error) {
    console.error("Помилка відправки форми:", error);
    showStatus("form.error", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.dataset.i18n = "form.submit";
    submitBtn.textContent = t("form.submit");
  }
});


/* ---------- СТАРТ ---------- */

document.getElementById("year").textContent = new Date().getFullYear();

// Мова: збережена раніше або українська за замовчуванням
let savedLang = DEFAULT_LANG;
try {
  savedLang = localStorage.getItem("lang") || DEFAULT_LANG;
} catch (e) {
  /* localStorage недоступний — лишаємо українську */
}
setLanguage(savedLang);

// Підтягуємо зайнятий час із бази
loadAvailability(true);

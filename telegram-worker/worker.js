/* =========================================================
   Barber Studio — посередник між сайтом, базою записів і Telegram (Cloudflare Worker)

   Навіщо він потрібен:
   Щоб бот написав повідомлення, потрібен токен бота — а він СЕКРЕТНИЙ.
   Код сайту бачить будь-хто, тому токен там тримати не можна.
   Worker працює в хмарі Cloudflare і знає токен, а сайт лише надсилає йому заявки.

   Що він вміє (адреси):
     POST /               — приймає заявку з сайту, бронює час у базі й надсилає її в Telegram
     GET  /availability   — каже сайту, які години вже зайняті (без імен і телефонів)
     POST /telegram       — сюди Telegram надсилає натискання кнопок «Підтвердити / Скасувати»
     GET  /setup-webhook?key=...  — один раз підключає ці кнопки (див. SETUP.md)

   Налаштування — НЕ в цьому файлі, а в Cloudflare (Worker → Settings):
     BOT_TOKEN       — секрет: токен бота від @BotFather
     CHAT_ID         — ID групи адміністраторів (наприклад -5002298485)
     WEBHOOK_SECRET  — секрет: будь-який придуманий пароль для кнопок у Telegram
     DB              — підключена база D1 (Bindings → D1 database)
   Без DB Worker теж працює, але не перевіряє зайнятий час і не показує кнопки.

   Інструкція з налаштування: telegram-worker/SETUP.md
   ========================================================= */

// Сайти, яким дозволено надсилати заявки. Додайте сюди свій домен, якщо він інший.
const ALLOWED_ORIGINS = [
  "https://blessedrbls.github.io",   // сайт на GitHub Pages
  "http://localhost:8080",           // локальна перевірка (python3 -m http.server 8080)
  "http://127.0.0.1:8080"
];

// Послуги: назва для повідомлення і тривалість у хвилинах (як data-duration в index.html)
const SERVICES = {
  haircut: { label: "Стрижка — 500 грн", duration: 60 },
  beard: { label: "Борода — 300 грн", duration: 30 },
  combo: { label: "Стрижка + борода — 750 грн", duration: 90 },
  kids: { label: "Дитяча стрижка — 400 грн", duration: 45 }
};

// Майстри. Зайнятість рахується окремо для кожного: якщо Дмитро зайнятий о 19:00,
// до Олександра на 19:00 записатися можна. (Майстер не може бути у двох філіалах одночасно,
// тому філіал на зайнятість не впливає.)
const MASTERS = {
  oleksandr: "Олександр Коваль",
  dmytro: "Дмитро Шевченко",
  andrii: "Андрій Бондар"
};

const BRANCHES = {
  khreshchatyk: "вул. Хрещатик, 22",
  honchara: "вул. Гончара, 15"
};

// Графік роботи — має збігатися з WORKING_HOURS у script.js
const WORKING_HOURS = {
  weekday: [9, 21],   // Пн–Пт 09:00–21:00
  weekend: [10, 19]   // Сб–Нд 10:00–19:00
};

const MAX_DAYS_AHEAD = 31;   // запис не далі ніж на місяць уперед


export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin);

    try {
      // Браузер перед POST-запитом з іншого сайту надсилає «пробний» запит OPTIONS
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: cors });
      }
      if (url.pathname === "/" && request.method === "POST") {
        return await handleBooking(request, env, origin, cors);
      }
      if (url.pathname === "/availability" && request.method === "GET") {
        return await handleAvailability(env, cors);
      }
      if (url.pathname === "/telegram" && request.method === "POST") {
        return await handleTelegramUpdate(request, env);
      }
      if (url.pathname === "/setup-webhook" && request.method === "GET") {
        return await handleSetupWebhook(url, env);
      }
      return json({ ok: false, error: "Not found" }, 404, cors);
    } catch (error) {
      // Деталі помилки видно в Cloudflare: Worker → Observability / Logs
      console.error("Unexpected error:", error);
      return json({ ok: false, error: "Server error" }, 500, cors);
    }
  }
};


/* =========================================================
   1. НОВА ЗАЯВКА З САЙТУ
   ========================================================= */

async function handleBooking(request, env, origin, cors) {
  if (!ALLOWED_ORIGINS.includes(origin)) {
    return json({ ok: false, error: "Origin not allowed" }, 403, cors);
  }

  if (!env.BOT_TOKEN || !env.CHAT_ID) {
    console.error("BOT_TOKEN або CHAT_ID не задані в налаштуваннях Worker'а");
    return json({ ok: false, error: "Server is not configured" }, 500, cors);
  }

  let data;
  try {
    data = await request.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON" }, 400, cors);
  }

  // «Пастка» для ботів: людина це поле не бачить. Відповідаємо «ок», але нічого не робимо.
  if (data.botcheck) {
    return json({ ok: true }, 200, cors);
  }

  // Перевіряємо поля (сайт теж перевіряє, але запит можна надіслати й в обхід сайту)
  const name = String(data.name || "").trim();
  const phone = String(data.phone || "").trim();
  const phoneDigits = phone.replace(/\D/g, "");
  const service = SERVICES[data.service];
  const date = String(data.date || "");
  const timeMatch = /^([01]\d|2[0-3]):00$/.exec(String(data.time || ""));   // лише «рівні» години: 10:00, 11:00...

  if (name.length < 1 || name.length > 60) {
    return json({ ok: false, error: "Invalid name" }, 400, cors);
  }
  if (phoneDigits.length < 10 || phoneDigits.length > 15 || phone.length > 25) {
    return json({ ok: false, error: "Invalid phone" }, 400, cors);
  }
  if (!service) {
    return json({ ok: false, error: "Invalid service" }, 400, cors);
  }
  if (!BRANCHES[data.branch]) {
    return json({ ok: false, error: "Invalid branch" }, 400, cors);
  }
  if (!isValidDate(date)) {
    return json({ ok: false, error: "Invalid date" }, 400, cors);
  }
  const hour = timeMatch ? Number(timeMatch[1]) : -1;
  if (!isWithinSchedule(date, hour, service.duration)) {
    return json({ ok: false, error: "Invalid time" }, 400, cors);
  }

  const wantedMaster = MASTERS[data.master] ? data.master : "any";

  // Заявка — у тому ж вигляді, в якому вона лежить у базі
  const booking = {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    date,
    hour,
    service: data.service,
    master: wantedMaster === "any" ? null : wantedMaster,
    auto_master: 0,
    branch: data.branch,
    name,
    phone,
    lang: data.lang === "en" ? "en" : "uk",
    status: "new"
  };

  // Бронюємо час у базі (якщо базу підключено)
  if (env.DB) {
    await ensureSchema(env.DB);
    const hours = hoursNeeded(hour, service.duration);

    // «Будь-який майстер» → пробуємо вільних по черзі, починаючи з найменш завантаженого
    const candidates = wantedMaster === "any"
      ? await freeMastersInOrder(env.DB, date, hours)
      : [wantedMaster];

    let reserved = false;
    for (const master of candidates) {
      booking.master = master;
      booking.auto_master = wantedMaster === "any" ? 1 : 0;
      if (await tryReserve(env.DB, booking, hours)) {
        reserved = true;
        break;
      }
    }

    if (!reserved) {
      // Хтось устиг записатися на цей час раніше
      return json({ ok: false, error: "Slot taken" }, 409, cors);
    }
  }

  // Надсилаємо в Telegram
  const sent = await telegram(env, "sendMessage", {
    chat_id: env.CHAT_ID,
    text: bookingText(booking),
    parse_mode: "HTML",
    reply_markup: env.DB ? buttonsFor(booking) : undefined
  });

  if (!sent.ok) {
    console.error("Telegram API error:", sent.description);
    // Адміністратор заявку не побачив — тому і час не тримаємо, звільняємо
    if (env.DB) await deleteBooking(env.DB, booking.id);
    return json({ ok: false, error: "Telegram error" }, 502, cors);
  }

  return json({ ok: true, master: booking.master }, 200, cors);
}


/* =========================================================
   2. ЗАЙНЯТИЙ ЧАС ДЛЯ САЙТУ
   Відповідь: { ok: true, enabled: true, busy: { "2026-11-12": { "19": ["dmytro"] } } }
   Тільки дата, година і майстер — без імен і телефонів клієнтів.
   ========================================================= */

async function handleAvailability(env, cors) {
  const headers = { ...cors, "Cache-Control": "no-store" };

  if (!env.DB) {
    return json({ ok: true, enabled: false, busy: {} }, 200, headers);
  }

  await ensureSchema(env.DB);
  const today = kyivNow().date;
  const lastDay = addDays(today, MAX_DAYS_AHEAD);

  const { results } = await env.DB
    .prepare("SELECT date, hour, master FROM slots WHERE date BETWEEN ? AND ?")
    .bind(today, lastDay)
    .all();

  const busy = {};
  for (const row of results) {
    busy[row.date] = busy[row.date] || {};
    busy[row.date][row.hour] = busy[row.date][row.hour] || [];
    busy[row.date][row.hour].push(row.master);
  }

  return json({ ok: true, enabled: true, busy }, 200, headers);
}


/* =========================================================
   3. КНОПКИ В TELEGRAM: «Підтвердити» і «Скасувати»
   ========================================================= */

async function handleTelegramUpdate(request, env) {
  // Перевіряємо, що запит справді від Telegram: він надсилає наш WEBHOOK_SECRET у заголовку
  if (!env.WEBHOOK_SECRET || request.headers.get("X-Telegram-Bot-Api-Secret-Token") !== env.WEBHOOK_SECRET) {
    return new Response("Forbidden", { status: 403 });
  }

  const update = await request.json().catch(() => null);
  const query = update && update.callback_query;   // callback_query — це натискання кнопки
  if (!query || !env.DB) {
    return new Response("ok");   // Telegram чекає відповідь 200, інакше надсилатиме повторно
  }

  const answer = (text) => telegram(env, "answerCallbackQuery", { callback_query_id: query.id, text });

  // Кнопки працюють тільки в групі адміністраторів
  if (!query.message || String(query.message.chat.id) !== String(env.CHAT_ID)) {
    await answer("Немає доступу");
    return new Response("ok");
  }

  await ensureSchema(env.DB);
  const [action, id] = String(query.data || "").split(":");
  const booking = await env.DB.prepare("SELECT * FROM bookings WHERE id = ?").bind(id).first();

  if (!booking) {
    await answer("Заявку не знайдено");
    return new Response("ok");
  }

  const who = escapeHtml([query.from.first_name, query.from.last_name].filter(Boolean).join(" ") || "адміністратор");

  if (action === "confirm") {
    if (booking.status !== "new") {
      await answer(booking.status === "cancelled" ? "Цю заявку вже скасовано" : "Вже підтверджено");
      return new Response("ok");
    }
    await env.DB.prepare("UPDATE bookings SET status = 'confirmed' WHERE id = ?").bind(id).run();
    booking.status = "confirmed";
    await updateMessage(env, query.message, booking, `✅ <b>Підтверджено</b> · ${who}`);
    await answer("Запис підтверджено");
  } else if (action === "cancel") {
    if (booking.status === "cancelled") {
      await answer("Вже скасовано");
      return new Response("ok");
    }
    // Видаляємо зайняті години — час знову вільний на сайті
    await env.DB.batch([
      env.DB.prepare("DELETE FROM slots WHERE booking_id = ?").bind(id),
      env.DB.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").bind(id)
    ]);
    booking.status = "cancelled";
    await updateMessage(env, query.message, booking, `❌ <b>Скасовано</b> · ${who}\nЦей час знову вільний на сайті.`);
    await answer("Запис скасовано, час звільнено");
  } else {
    await answer("Невідома дія");
  }

  return new Response("ok");
}

// Одноразове підключення кнопок: відкрити в браузері /setup-webhook?key=ВАШ_WEBHOOK_SECRET
async function handleSetupWebhook(url, env) {
  if (!env.BOT_TOKEN || !env.WEBHOOK_SECRET) {
    return text("❌ Спочатку додайте в Settings → Variables and Secrets секрети BOT_TOKEN і WEBHOOK_SECRET.", 500);
  }
  if (!/^[A-Za-z0-9_-]{16,256}$/.test(env.WEBHOOK_SECRET)) {
    return text("❌ WEBHOOK_SECRET має бути від 16 символів і містити лише латинські літери, цифри, _ або -.", 500);
  }
  if (url.searchParams.get("key") !== env.WEBHOOK_SECRET) {
    return text("❌ Невірний key. Він має збігатися з WEBHOOK_SECRET.", 403);
  }
  if (!env.DB) {
    return text("❌ Спочатку підключіть базу: Settings → Bindings → D1 database, імʼя змінної DB.", 500);
  }

  const result = await telegram(env, "setWebhook", {
    url: `${url.origin}/telegram`,
    secret_token: env.WEBHOOK_SECRET,
    allowed_updates: ["callback_query"]   // бот отримуватиме лише натискання кнопок
  });

  return result.ok
    ? text("✅ Готово! Кнопки «Підтвердити / Скасувати» підключено. Цю сторінку можна закрити.")
    : text(`❌ Telegram відповів: ${result.description}`, 502);
}


/* =========================================================
   БАЗА ДАНИХ (Cloudflare D1 — це SQLite у хмарі)
   ========================================================= */

let schemaReady = false;

// Створює таблиці, якщо їх ще немає. Тому нічого не треба вводити вручну в консолі D1.
async function ensureSchema(db) {
  if (schemaReady) return;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      date TEXT NOT NULL,
      hour INTEGER NOT NULL,
      service TEXT NOT NULL,
      master TEXT,
      auto_master INTEGER NOT NULL DEFAULT 0,
      branch TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      lang TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new'
    )`),
    // Одна година одного майстра = один рядок. PRIMARY KEY не дасть записати двох людей
    // до одного майстра на ту саму годину — навіть якщо вони натиснули кнопку одночасно.
    db.prepare(`CREATE TABLE IF NOT EXISTS slots (
      master TEXT NOT NULL,
      date TEXT NOT NULL,
      hour INTEGER NOT NULL,
      booking_id TEXT NOT NULL,
      PRIMARY KEY (master, date, hour)
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS slots_by_booking ON slots (booking_id)")
  ]);
  schemaReady = true;
}

// Пробує забронювати години. batch виконується як одна транзакція:
// якщо хоч одна година вже зайнята — не записується нічого.
async function tryReserve(db, b, hours) {
  try {
    await db.batch([
      db.prepare(`INSERT INTO bookings
        (id, created_at, date, hour, service, master, auto_master, branch, name, phone, lang, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(b.id, b.created_at, b.date, b.hour, b.service, b.master, b.auto_master, b.branch, b.name, b.phone, b.lang, b.status),
      ...hours.map((h) =>
        db.prepare("INSERT INTO slots (master, date, hour, booking_id) VALUES (?, ?, ?, ?)").bind(b.master, b.date, h, b.id)
      )
    ]);
    return true;
  } catch (error) {
    if (/UNIQUE constraint failed/i.test(String(error && error.message))) return false;   // час зайнятий
    throw error;
  }
}

// Вільні на ці години майстри: спершу ті, у кого цього дня найменше записів
async function freeMastersInOrder(db, date, hours) {
  const placeholders = hours.map(() => "?").join(", ");
  const { results: busyRows } = await db
    .prepare(`SELECT DISTINCT master FROM slots WHERE date = ? AND hour IN (${placeholders})`)
    .bind(date, ...hours)
    .all();
  const busy = new Set(busyRows.map((row) => row.master));

  const { results: loadRows } = await db
    .prepare("SELECT master, COUNT(*) AS n FROM slots WHERE date = ? GROUP BY master")
    .bind(date)
    .all();
  const load = Object.fromEntries(loadRows.map((row) => [row.master, row.n]));

  return Object.keys(MASTERS)
    .filter((master) => !busy.has(master))
    .sort((a, b) => (load[a] || 0) - (load[b] || 0));
}

async function deleteBooking(db, id) {
  await db.batch([
    db.prepare("DELETE FROM slots WHERE booking_id = ?").bind(id),
    db.prepare("DELETE FROM bookings WHERE id = ?").bind(id)
  ]);
}


/* =========================================================
   ДАТИ І ГРАФІК (усе за київським часом)
   ========================================================= */

// { date: "2026-11-10", minutes: 1085 } — дата і хвилини від початку доби в Києві
function kyivNow() {
  const parts = {};
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Kyiv",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(new Date()).forEach((p) => { parts[p.type] = p.value; });

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute)
  };
}

function toISODate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(iso, days) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return toISODate(date);
}

// Дата у форматі "2026-11-12", не в минулому і не далі ніж MAX_DAYS_AHEAD днів уперед
function isValidDate(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || toISODate(date) !== iso) return false;   // відсікає "2026-02-31"
  const today = kyivNow().date;
  return iso >= today && iso <= addDays(today, MAX_DAYS_AHEAD);
}

// Чи можна почати послугу о цій годині: салон відкритий, послуга встигає закінчитися,
// а якщо це сьогодні — година ще не минула
function isWithinSchedule(iso, hour, duration) {
  if (hour < 0) return false;
  const dayOfWeek = new Date(`${iso}T00:00:00Z`).getUTCDay();   // 0 — неділя, 6 — субота
  const [open, close] = (dayOfWeek === 0 || dayOfWeek === 6) ? WORKING_HOURS.weekend : WORKING_HOURS.weekday;
  if (hour < open || hour * 60 + duration > close * 60) return false;

  const now = kyivNow();
  if (iso === now.date && hour * 60 <= now.minutes) return false;
  return true;
}

// Які години займає послуга: 90 хв о 19:00 → [19, 20]
function hoursNeeded(hour, duration) {
  return Array.from({ length: Math.ceil(duration / 60) }, (_, i) => hour + i);
}

// "2026-11-12" → "Чт, 12.11.2026"
function formatDate(iso) {
  const date = new Date(`${iso}T00:00:00Z`);
  const weekday = date.toLocaleDateString("uk-UA", { weekday: "short", timeZone: "UTC" });
  const [year, month, day] = iso.split("-");
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${day}.${month}.${year}`;
}


/* =========================================================
   ПОВІДОМЛЕННЯ В TELEGRAM
   ========================================================= */

function bookingText(b, statusLine) {
  const service = SERVICES[b.service];
  const master = b.master
    ? MASTERS[b.master] + (b.auto_master ? " <i>(призначено автоматично)</i>" : "")
    : "Будь-який майстер";
  const sentAt = new Date(b.created_at).toLocaleString("uk-UA", {
    timeZone: "Europe/Kyiv",
    dateStyle: "short",
    timeStyle: "short"
  });

  const lines = [
    "🆕 <b>Нова заявка з сайту</b>",
    "",
    `📅 <b>${formatDate(b.date)} о ${String(b.hour).padStart(2, "0")}:00</b>`,
    `📍 ${BRANCHES[b.branch]}`,
    `✂️ ${service.label}, ${service.duration} хв`,
    `💈 ${master}`,
    "",
    `👤 ${escapeHtml(b.name)}`,
    `📞 ${escapeHtml(b.phone)}`,
    "",
    `<i>Заявку надіслано ${sentAt} · мова сайту: ${b.lang === "en" ? "EN" : "UA"}</i>`
  ];
  if (statusLine) lines.push("", statusLine);
  return lines.join("\n");
}

// Кнопки під повідомленням залежно від статусу заявки
function buttonsFor(b) {
  if (b.status === "new") {
    return {
      inline_keyboard: [[
        { text: "✅ Підтвердити", callback_data: `confirm:${b.id}` },
        { text: "❌ Скасувати", callback_data: `cancel:${b.id}` }
      ]]
    };
  }
  if (b.status === "confirmed") {
    return { inline_keyboard: [[{ text: "❌ Скасувати", callback_data: `cancel:${b.id}` }]] };
  }
  return { inline_keyboard: [] };   // скасовано — кнопок більше немає
}

function updateMessage(env, message, booking, statusLine) {
  return telegram(env, "editMessageText", {
    chat_id: message.chat.id,
    message_id: message.message_id,
    text: bookingText(booking, statusLine),
    parse_mode: "HTML",
    reply_markup: buttonsFor(booking)
  });
}

// Виклик методу Telegram Bot API. Повертає { ok, result } або { ok: false, description }
async function telegram(env, method, payload) {
  const response = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return response.json().catch(() => ({ ok: false, description: `HTTP ${response.status}` }));
}


/* =========================================================
   ДОПОМІЖНІ ФУНКЦІЇ
   ========================================================= */

// Заголовки CORS: дозволяють браузеру з нашого сайту читати відповідь Worker'а
function corsHeaders(origin) {
  const headers = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
  if (ALLOWED_ORIGINS.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function json(body, status, extraHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...extraHeaders }
  });
}

function text(message, status = 200) {
  return new Response(message, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

// Екрануємо символи < > &, щоб імʼя на кшталт "<b>" не зламало розмітку повідомлення
function escapeHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

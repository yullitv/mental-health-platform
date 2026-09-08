const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");

// Базовий захист усього /api від скрапінгу/спаму — досить щедрий, щоб не
// заважати звичайному використанню застосунку.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Забагато запитів. Спробуй трохи пізніше." },
});

// Суворіший ліміт для ендпоінтів, які викликають Gemini (AI-компаньйон,
// тижнева рефлексія щоденника, аналіз думки, AI-скринінг документів
// спеціаліста) — щоб один користувач не міг роздути рахунок за AI.
// Рахуємо по користувачу (req.dbUser зʼявляється після requireRole), а
// не по IP — інакше кілька людей за одним NAT ділили б один ліміт.
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  // req.ip самостійно не годиться як ключ для IPv6 — express-rate-limit
  // вимагає нормалізувати його через ipKeyGenerator (інакше користувач
  // міг би обходити ліміт, змінюючи молодші біти своєї IPv6-адреси).
  keyGenerator: (req) => req.dbUser?.id || ipKeyGenerator(req.ip),
  message: { message: "Забагато AI-запитів поспіль. Спробуй за кілька хвилин." },
});

module.exports = { apiLimiter, aiLimiter };

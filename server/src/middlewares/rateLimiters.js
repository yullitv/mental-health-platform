const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Забагато запитів. Спробуй трохи пізніше." },
});

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.dbUser?.id || ipKeyGenerator(req.ip),
  message: {
    message: "Забагато AI-запитів поспіль. Спробуй за кілька хвилин.",
  },
});

module.exports = { apiLimiter, aiLimiter };

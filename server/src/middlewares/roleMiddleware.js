const prisma = require("../prisma");
const { getAuth } = require("@clerk/express");

/**
 * Використання: router.get('/шлях', requireRole('ADMIN'), controller)
 * requireAuth() з @clerk/express навмисно НЕ використовуємо — при 401 він робить
 * redirect замість JSON і ламає fetch на фронтенді. requireRole сам перевіряє
 * userId через getAuth(req) (працює завдяки глобальному clerkMiddleware() в
 * server.js) і повертає чистий JSON 401/403.
 */
const requireRole = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      const { userId } = getAuth(req);

      if (!userId) {
        return res.status(401).json({ message: "Неавторизований доступ" });
      }

      const user = await prisma.user.findUnique({ where: { clerkId: userId } });

      if (!user) {
        return res.status(401).json({ message: "Користувача не знайдено" });
      }

      if (!allowedRoles.includes(user.role)) {
        return res
          .status(403)
          .json({ message: "Недостатньо прав для цієї дії" });
      }

      req.dbUser = user;
      next();
    } catch (error) {
      console.error("❌ Помилка перевірки ролі:", error);
      res.status(500).json({ message: "Помилка сервера" });
    }
  };
};

module.exports = requireRole;

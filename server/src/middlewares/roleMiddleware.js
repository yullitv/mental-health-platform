const prisma = require('../prisma');
const { getAuth } = require('@clerk/express');

/**
 * Дозволяє доступ лише користувачам із переліченими ролями.
 * Використання: router.get('/шлях', requireAuth(), requireRole('ADMIN'), controller)
 * ВАЖЛИВО: ставити ПІСЛЯ requireAuth() з @clerk/express — інакше getAuth(req) буде порожнім.
 */
const requireRole = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      const { userId } = getAuth(req);

      if (!userId) {
        return res.status(401).json({ message: 'Неавторизований доступ' });
      }

      const user = await prisma.user.findUnique({ where: { clerkId: userId } });

      if (!user) {
        return res.status(401).json({ message: 'Користувача не знайдено' });
      }

      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ message: 'Недостатньо прав для цієї дії' });
      }

      req.dbUser = user;
      next();
    } catch (error) {
      console.error('❌ Помилка перевірки ролі:', error);
      res.status(500).json({ message: 'Помилка сервера' });
    }
  };
};

module.exports = requireRole;

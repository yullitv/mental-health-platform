const prisma = require('../prisma');

// GET /api/notifications — сповіщення поточного користувача
exports.getMyNotifications = async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.dbUser.id },
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json(notifications);
  } catch (error) {
    console.error('❌ Помилка отримання сповіщень:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

// PUT /api/notifications/:id/read — позначити одне сповіщення прочитаним
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await prisma.notification.findUnique({ where: { id } });

    if (!notification) {
      return res.status(404).json({ message: 'Сповіщення не знайдено' });
    }
    if (notification.userId !== req.dbUser.id) {
      return res.status(403).json({ message: 'Немає доступу до цього сповіщення' });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    res.status(200).json(updated);
  } catch (error) {
    console.error('❌ Помилка оновлення сповіщення:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

// PUT /api/notifications/read-all — позначити всі сповіщення прочитаними
exports.markAllAsRead = async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.dbUser.id, isRead: false },
      data: { isRead: true },
    });
    res.status(200).json({ message: 'Усі сповіщення позначено прочитаними' });
  } catch (error) {
    console.error('❌ Помилка оновлення сповіщень:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};
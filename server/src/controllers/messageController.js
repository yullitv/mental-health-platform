const prisma = require("../prisma");
const { createNotification } = require("../utils/notificationHelper");
const { getIo } = require("../socket");

// Допоміжна перевірка: чи має користувач доступ до сесії
async function getSessionWithAccessCheck(sessionId, dbUser) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { specialist: true },
  });

  if (!session) {
    const err = new Error("Сесію не знайдено");
    err.status = 404;
    throw err;
  }

  const isClient = session.clientId === dbUser.id;
  const isSpecialist = session.specialist.userId === dbUser.id;

  if (!isClient && !isSpecialist) {
    const err = new Error("Немає доступу до цієї сесії");
    err.status = 403;
    throw err;
  }

  return session;
}

// POST /api/messages — надіслати повідомлення
exports.sendMessage = async (req, res) => {
  try {
    const { sessionId, content } = req.body;

    if (!sessionId || !content || !content.trim()) {
      return res
        .status(400)
        .json({ message: "sessionId та content обов'язкові" });
    }

    const session = await getSessionWithAccessCheck(sessionId, req.dbUser);

    const message = await prisma.message.create({
      data: {
        sessionId,
        senderId: req.dbUser.id,
        content: content.trim(),
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
    });

    getIo().to(`session:${sessionId}`).emit("newMessage", message);

    const recipientId =
      session.clientId === req.dbUser.id
        ? session.specialist.userId
        : session.clientId;

    await createNotification({
      userId: recipientId,
      type: "NEW_MESSAGE",
      title: "Нове повідомлення",
      message: content.trim().slice(0, 100),
      link: `/sessions/${sessionId}/chat`,
    });

    res.status(201).json(message);
  } catch (error) {
    console.error("Помилка при відправці повідомлення:", error);
    res
      .status(error.status || 500)
      .json({ message: error.message || "Помилка сервера" });
  }
};

// GET /api/messages/:sessionId — отримати всі повідомлення сесії
exports.getSessionMessages = async (req, res) => {
  try {
    const { sessionId } = req.params;

    await getSessionWithAccessCheck(sessionId, req.dbUser);

    const messages = await prisma.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
    });

    res.json(messages);
  } catch (error) {
    console.error("Помилка при отриманні повідомлень:", error);
    res
      .status(error.status || 500)
      .json({ message: error.message || "Помилка сервера" });
  }
};

// PUT /api/messages/:id — редагувати власне повідомлення
exports.editMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: "content обов'язковий" });
    }

    const message = await prisma.message.findUnique({ where: { id } });

    if (!message) {
      return res.status(404).json({ message: "Повідомлення не знайдено" });
    }
    if (message.senderId !== req.dbUser.id) {
      return res
        .status(403)
        .json({ message: "Можна редагувати лише власні повідомлення" });
    }
    if (message.isDeleted) {
      return res
        .status(400)
        .json({ message: "Видалене повідомлення не можна редагувати" });
    }

    const updated = await prisma.message.update({
      where: { id },
      data: { content: content.trim(), editedAt: new Date() },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
    });

    getIo().to(`session:${message.sessionId}`).emit("messageUpdated", updated);

    res.json(updated);
  } catch (error) {
    console.error("Помилка при редагуванні повідомлення:", error);
    res
      .status(error.status || 500)
      .json({ message: error.message || "Помилка сервера" });
  }
};

// DELETE /api/messages/:id — видалити власне повідомлення (м'яке видалення)
exports.deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;

    const message = await prisma.message.findUnique({ where: { id } });

    if (!message) {
      return res.status(404).json({ message: "Повідомлення не знайдено" });
    }
    if (message.senderId !== req.dbUser.id) {
      return res
        .status(403)
        .json({ message: "Можна видаляти лише власні повідомлення" });
    }
    if (message.isDeleted) {
      return res.json(message);
    }

    const updated = await prisma.message.update({
      where: { id },
      data: { content: "", isDeleted: true, editedAt: null },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
    });

    getIo().to(`session:${message.sessionId}`).emit("messageDeleted", updated);

    res.json(updated);
  } catch (error) {
    console.error("Помилка при видаленні повідомлення:", error);
    res
      .status(error.status || 500)
      .json({ message: error.message || "Помилка сервера" });
  }
};

// PUT /api/messages/:sessionId/read — позначити чужі повідомлення як прочитані
exports.markAsRead = async (req, res) => {
  try {
    const { sessionId } = req.params;

    await getSessionWithAccessCheck(sessionId, req.dbUser);

    await prisma.message.updateMany({
      where: {
        sessionId,
        senderId: { not: req.dbUser.id },
        isRead: false,
      },
      data: { isRead: true },
    });

    res.json({ message: "Повідомлення позначені як прочитані" });
  } catch (error) {
    console.error("Помилка при позначенні повідомлень:", error);
    res
      .status(error.status || 500)
      .json({ message: error.message || "Помилка сервера" });
  }
};

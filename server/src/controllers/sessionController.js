const prisma = require("../prisma");
const { createNotification } = require("../utils/notificationHelper");

// POST /api/sessions/book — клієнт бронює слот, створюється сесія
exports.bookSlot = async (req, res) => {
  try {
    const { slotId } = req.body;
    if (!slotId) {
      return res.status(400).json({ message: "Поле 'slotId' обов'язкове" });
    }

    const session = await prisma.$transaction(async (tx) => {
      const slot = await tx.availabilitySlot.findUnique({
        where: { id: slotId },
      });

      if (!slot) {
        throw { status: 404, message: "Слот не знайдено" };
      }
      if (slot.isBooked) {
        throw { status: 409, message: "Цей слот вже заброньовано" };
      }
      if (slot.startTime < new Date()) {
        throw { status: 400, message: "Не можна забронювати слот у минулому" };
      }

      const newSession = await tx.session.create({
        data: {
          clientId: req.dbUser.id,
          specialistId: slot.specialistId,
          startTime: slot.startTime,
          endTime: slot.endTime,
          status: "CREATED",
          slotId: slot.id,
        },
      });

      await tx.availabilitySlot.update({
        where: { id: slot.id },
        data: { isBooked: true },
      });

      return newSession;
    });

    const specialistProfile = await prisma.specialistProfile.findUnique({
      where: { id: session.specialistId },
    });
    if (specialistProfile) {
      await createNotification({
        userId: specialistProfile.userId,
        type: "SESSION_BOOKED",
        title: "Нове бронювання",
        message: `У вас нова сесія на ${session.startTime.toLocaleString("uk-UA")}`,
        link: `/dashboard`,
      });
    }

    res.status(201).json(session);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    console.error("❌ Помилка бронювання:", error);
    res.status(500).json({ message: "Помилка сервера" });
  }
};

// GET /api/sessions/mine — сесії поточного користувача (як клієнта або спеціаліста)
exports.getMySessions = async (req, res) => {
  try {
    const user = req.dbUser;
    let sessions;

    if (user.role === "SPECIALIST") {
      const profile = await prisma.specialistProfile.findUnique({
        where: { userId: user.id },
      });
      if (!profile) {
        return res
          .status(404)
          .json({ message: "Профіль спеціаліста не знайдено" });
      }
      sessions = await prisma.session.findMany({
        where: { specialistId: profile.id },
        include: {
          client: { select: { firstName: true, lastName: true, email: true } },
          review: true,
        },
        orderBy: { startTime: "desc" },
      });
    } else {
      sessions = await prisma.session.findMany({
        where: { clientId: user.id },
        include: {
          specialist: {
            include: { user: { select: { firstName: true, lastName: true } } },
          },
          review: true,
        },
        orderBy: { startTime: "desc" },
      });
    }

    res.status(200).json(sessions);
  } catch (error) {
    console.error("❌ Помилка отримання сесій:", error);
    res.status(500).json({ message: "Помилка сервера" });
  }
};

// GET /api/sessions/:id — деталі однієї сесії (наприклад, для сторінки
// відео-дзвінка) — доступно лише клієнту й спеціалісту саме цієї сесії
exports.getSessionById = async (req, res) => {
  try {
    const { id } = req.params;

    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        client: { select: { firstName: true, lastName: true } },
        specialist: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
    });

    if (!session) {
      return res.status(404).json({ message: "Сесію не знайдено" });
    }

    const isClient = session.clientId === req.dbUser.id;
    const isSpecialist = session.specialist.userId === req.dbUser.id;
    if (!isClient && !isSpecialist) {
      return res.status(403).json({ message: "Це не ваша сесія" });
    }

    res.status(200).json(session);
  } catch (error) {
    console.error("❌ Помилка отримання сесії:", error);
    res.status(500).json({ message: "Помилка сервера" });
  }
};

// PUT /api/sessions/:id/complete — спеціаліст позначає сесію завершеною
exports.completeSession = async (req, res) => {
  try {
    const { id } = req.params;

    const session = await prisma.session.findUnique({
      where: { id },
      include: { specialist: true },
    });

    if (!session) {
      return res.status(404).json({ message: "Сесію не знайдено" });
    }
    if (session.specialist.userId !== req.dbUser.id) {
      return res.status(403).json({ message: "Це не ваша сесія" });
    }
    if (session.status !== "CONFIRMED") {
      return res
        .status(409)
        .json({ message: "Завершити можна лише підтверджену сесію" });
    }

    const updated = await prisma.session.update({
      where: { id },
      data: { status: "COMPLETED" },
    });

    res.status(200).json(updated);
  } catch (error) {
    console.error("❌ Помилка завершення сесії:", error);
    res.status(500).json({ message: "Помилка сервера" });
  }
};

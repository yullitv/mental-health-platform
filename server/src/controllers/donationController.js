const prisma = require("../prisma");
const { createNotification } = require("../utils/notificationHelper");

// POST /api/donations — клієнт надсилає підтвердження донату для своєї сесії
exports.createDonation = async (req, res) => {
  try {
    const { sessionId, fundraiserId, amount, proofUrl } = req.body;

    if (!sessionId || !fundraiserId || !proofUrl) {
      return res.status(400).json({
        message: "Поля 'sessionId', 'fundraiserId' та 'proofUrl' обов'язкові",
      });
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });
    if (!session) {
      return res.status(404).json({ message: "Сесію не знайдено" });
    }
    if (session.clientId !== req.dbUser.id) {
      return res.status(403).json({ message: "Це не ваша сесія" });
    }
    if (session.status !== "CREATED" && session.status !== "PENDING_DONATION") {
      return res
        .status(409)
        .json({ message: "Для цієї сесії донат вже не можна подати" });
    }

    const fundraiser = await prisma.fundraiser.findUnique({
      where: { id: fundraiserId },
    });
    if (!fundraiser || !fundraiser.isActive) {
      return res
        .status(404)
        .json({ message: "Фонд не знайдено або він неактивний" });
    }

    const [donation] = await prisma.$transaction([
      prisma.donation.create({
        data: {
          sessionId,
          fundraiserId,
          amount: amount ? Number(amount) : null,
          proofUrl,
          status: "PENDING",
        },
      }),
      prisma.session.update({
        where: { id: sessionId },
        data: { status: "PENDING_DONATION", fundraiserId },
      }),
    ]);

    const specialistProfile = await prisma.specialistProfile.findUnique({
      where: { id: session.specialistId },
    });
    if (specialistProfile) {
      await createNotification({
        userId: specialistProfile.userId,
        type: "DONATION_SUBMITTED",
        title: "Новий донат очікує підтвердження",
        message: `Клієнт подав підтвердження донату на суму ${amount || "—"} грн`,
        link: `/donations`,
      });
    }

    res.status(201).json(donation);
  } catch (error) {
    console.error("❌ Помилка створення донату:", error);
    res.status(500).json({ message: "Помилка сервера" });
  }
};

// GET /api/donations/pending — список донатів, що очікують підтвердження
exports.getPendingDonations = async (req, res) => {
  try {
    const user = req.dbUser;
    const where = { status: "PENDING" };

    if (user.role === "SPECIALIST") {
      const profile = await prisma.specialistProfile.findUnique({
        where: { userId: user.id },
      });
      if (!profile) {
        return res
          .status(404)
          .json({ message: "Профіль спеціаліста не знайдено" });
      }
      where.session = { specialistId: profile.id };
    }
    // ADMIN бачить усі PENDING донати без додаткового фільтра

    const donations = await prisma.donation.findMany({
      where,
      include: {
        session: {
          include: {
            client: {
              select: { firstName: true, lastName: true, email: true },
            },
          },
        },
        fundraiser: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    res.status(200).json(donations);
  } catch (error) {
    console.error("❌ Помилка отримання донатів:", error);
    res.status(500).json({ message: "Помилка сервера" });
  }
};

// Спільна перевірка доступу для confirm/reject
const resolveDonationAccess = async (donationId, user) => {
  const donation = await prisma.donation.findUnique({
    where: { id: donationId },
    include: { session: true },
  });

  if (!donation) {
    return { error: { status: 404, message: "Донат не знайдено" } };
  }

  if (user.role === "SPECIALIST") {
    const profile = await prisma.specialistProfile.findUnique({
      where: { userId: user.id },
    });
    if (!profile || donation.session.specialistId !== profile.id) {
      return { error: { status: 403, message: "Це не ваша сесія" } };
    }
  }
  // ADMIN має доступ до всього

  if (donation.status !== "PENDING") {
    return { error: { status: 409, message: "Цей донат вже опрацьовано" } };
  }

  return { donation };
};

// PUT /api/donations/:id/confirm — підтвердження донату
exports.confirmDonation = async (req, res) => {
  try {
    const { id } = req.params;
    const { donation, error } = await resolveDonationAccess(id, req.dbUser);
    if (error) return res.status(error.status).json({ message: error.message });

    const [updatedDonation] = await prisma.$transaction([
      prisma.donation.update({
        where: { id },
        data: {
          status: "CONFIRMED",
          confirmedById: req.dbUser.id,
          confirmedAt: new Date(),
        },
      }),
      prisma.session.update({
        where: { id: donation.sessionId },
        data: { status: "CONFIRMED" },
      }),
    ]);

    await createNotification({
      userId: donation.session.clientId,
      type: "DONATION_CONFIRMED",
      title: "Донат підтверджено",
      message: "Вашу сесію підтверджено — очікуйте на зустріч.",
      link: `/sessions/${donation.sessionId}`,
    });

    res.status(200).json(updatedDonation);
  } catch (error) {
    console.error("❌ Помилка підтвердження донату:", error);
    res.status(500).json({ message: "Помилка сервера" });
  }
};

// PUT /api/donations/:id/reject — відхилення донату
exports.rejectDonation = async (req, res) => {
  try {
    const { id } = req.params;
    const { donation, error } = await resolveDonationAccess(id, req.dbUser);
    if (error) return res.status(error.status).json({ message: error.message });

    const [updatedDonation] = await prisma.$transaction([
      prisma.donation.update({
        where: { id },
        data: {
          status: "REJECTED",
          confirmedById: req.dbUser.id,
          confirmedAt: new Date(),
        },
      }),
      prisma.session.update({
        where: { id: donation.sessionId },
        data: { status: "CREATED" },
      }),
    ]);

    await createNotification({
      userId: donation.session.clientId,
      type: "DONATION_REJECTED",
      title: "Донат відхилено",
      message: "Ваше підтвердження донату відхилено. Спробуйте подати знову.",
      link: `/sessions/${donation.sessionId}`,
    });

    res.status(200).json(updatedDonation);
  } catch (error) {
    console.error("❌ Помилка відхилення донату:", error);
    res.status(500).json({ message: "Помилка сервера" });
  }
};

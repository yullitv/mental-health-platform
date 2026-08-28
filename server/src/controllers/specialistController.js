const prisma = require('../prisma');

// GET /api/specialists — публічний список підтверджених спеціалістів
exports.getApprovedSpecialists = async (req, res) => {
  try {
    const specialists = await prisma.specialistProfile.findMany({
      where: { verificationStatus: 'APPROVED' },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    });
    res.status(200).json(specialists);
  } catch (error) {
    console.error('❌ Помилка отримання спеціалістів:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

// GET /api/specialists/pending — ADMIN: профілі, що очікують підтвердження
exports.getPendingSpecialists = async (req, res) => {
  try {
    const specialists = await prisma.specialistProfile.findMany({
      where: { verificationStatus: 'PENDING' },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    });
    res.status(200).json(specialists);
  } catch (error) {
    console.error('❌ Помилка отримання заявок:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

// PUT /api/specialists/me — спеціаліст редагує власний профіль
exports.updateMyProfile = async (req, res) => {
  try {
    const { bio, specializations, hourlyRate, documentsUrl } = req.body;

    const profile = await prisma.specialistProfile.findUnique({
      where: { userId: req.dbUser.id },
    });
    if (!profile) {
      return res.status(404).json({ message: 'Профіль спеціаліста не знайдено' });
    }

    const updated = await prisma.specialistProfile.update({
      where: { userId: req.dbUser.id },
      data: {
        ...(bio !== undefined && { bio }),
        ...(specializations !== undefined && { specializations }),
        ...(hourlyRate !== undefined && { hourlyRate: Number(hourlyRate) }),
        ...(documentsUrl !== undefined && { documentsUrl }),
      },
    });

    res.status(200).json(updated);
  } catch (error) {
    console.error('❌ Помилка оновлення профілю:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

// PUT /api/specialists/:id/verify — ADMIN підтверджує або відхиляє профіль
exports.verifySpecialist = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (status !== 'APPROVED' && status !== 'REJECTED') {
      return res.status(400).json({ message: "status має бути 'APPROVED' або 'REJECTED'" });
    }

    const updated = await prisma.specialistProfile.update({
      where: { id },
      data: { verificationStatus: status },
    });

    res.status(200).json(updated);
  } catch (error) {
    console.error('❌ Помилка підтвердження спеціаліста:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

// GET /api/specialists/:id — публічна картка одного спеціаліста
exports.getSpecialistById = async (req, res) => {
  try {
    const { id } = req.params;
    const specialist = await prisma.specialistProfile.findUnique({
      where: { id },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    });

    if (!specialist) {
      return res.status(404).json({ message: 'Спеціаліста не знайдено' });
    }

    res.status(200).json(specialist);
  } catch (error) {
    console.error('❌ Помилка отримання спеціаліста:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};
const prisma = require('../prisma');

// POST /api/availability — спеціаліст відкриває новий слот
exports.createSlot = async (req, res) => {
  try {
    const { startTime, endTime } = req.body;
    if (!startTime || !endTime) {
      return res.status(400).json({ message: "Поля 'startTime' та 'endTime' обов'язкові" });
    }

    const profile = await prisma.specialistProfile.findUnique({ where: { userId: req.dbUser.id } });
    if (!profile) {
      return res.status(404).json({ message: 'Профіль спеціаліста не знайдено' });
    }

    const slot = await prisma.availabilitySlot.create({
      data: {
        specialistId: profile.id,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
      },
    });

    res.status(201).json(slot);
  } catch (error) {
    console.error('❌ Помилка створення слоту:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

// GET /api/availability/mine — усі слоти поточного спеціаліста (заброньовані й ні)
exports.getMySlots = async (req, res) => {
  try {
    const profile = await prisma.specialistProfile.findUnique({ where: { userId: req.dbUser.id } });
    if (!profile) {
      return res.status(404).json({ message: 'Профіль спеціаліста не знайдено' });
    }

    const slots = await prisma.availabilitySlot.findMany({
      where: { specialistId: profile.id },
      orderBy: { startTime: 'asc' },
    });

    res.status(200).json(slots);
  } catch (error) {
    console.error('❌ Помилка отримання слотів:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

// GET /api/availability/:specialistId — публічний список вільних майбутніх слотів спеціаліста
exports.getAvailableSlots = async (req, res) => {
  try {
    const { specialistId } = req.params;

    const slots = await prisma.availabilitySlot.findMany({
      where: {
        specialistId,
        isBooked: false,
        startTime: { gt: new Date() },
      },
      orderBy: { startTime: 'asc' },
    });

    res.status(200).json(slots);
  } catch (error) {
    console.error('❌ Помилка отримання вільних слотів:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

// DELETE /api/availability/:id — спеціаліст видаляє свій незаброньований слот
exports.deleteSlot = async (req, res) => {
  try {
    const { id } = req.params;

    const profile = await prisma.specialistProfile.findUnique({ where: { userId: req.dbUser.id } });
    if (!profile) {
      return res.status(404).json({ message: 'Профіль спеціаліста не знайдено' });
    }

    const slot = await prisma.availabilitySlot.findUnique({ where: { id } });
    if (!slot || slot.specialistId !== profile.id) {
      return res.status(404).json({ message: 'Слот не знайдено' });
    }
    if (slot.isBooked) {
      return res.status(409).json({ message: 'Не можна видалити заброньований слот' });
    }

    await prisma.availabilitySlot.delete({ where: { id } });
    res.status(200).json({ message: 'Слот видалено' });
  } catch (error) {
    console.error('❌ Помилка видалення слоту:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};
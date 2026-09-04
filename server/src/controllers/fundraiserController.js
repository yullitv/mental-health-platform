const prisma = require('../prisma');

// GET /api/fundraisers — публічний список активних фондів (для вибору під час донату)
exports.getActiveFundraisers = async (req, res) => {
  try {
    const fundraisers = await prisma.fundraiser.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json(fundraisers);
  } catch (error) {
    console.error('❌ Помилка отримання фондів:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

// GET /api/fundraisers/admin — усі фонди (активні й неактивні), лише для адміна
exports.getAllFundraisers = async (req, res) => {
  try {
    const fundraisers = await prisma.fundraiser.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json(fundraisers);
  } catch (error) {
    console.error('❌ Помилка отримання фондів (admin):', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

// POST /api/fundraisers — створення нового фонду, лише адмін
exports.createFundraiser = async (req, res) => {
  try {
    const { name, description, bankJarUrl, category, logoUrl, isVerified, monobankJarId } = req.body;

    if (!name || !bankJarUrl) {
      return res.status(400).json({ message: "Поля 'name' та 'bankJarUrl' обов'язкові" });
    }

    const fundraiser = await prisma.fundraiser.create({
      data: {
        name,
        description,
        bankJarUrl,
        category,
        logoUrl,
        isVerified: !!isVerified,
        monobankJarId: monobankJarId || null,
      },
    });

    res.status(201).json(fundraiser);
  } catch (error) {
    console.error('❌ Помилка створення фонду:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

// PUT /api/fundraisers/:id — редагування (включно з isActive/isVerified), лише адмін
exports.updateFundraiser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, bankJarUrl, category, logoUrl, isVerified, isActive, monobankJarId } =
      req.body;

    const existing = await prisma.fundraiser.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Фонд не знайдено' });
    }

    const fundraiser = await prisma.fundraiser.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(bankJarUrl !== undefined && { bankJarUrl }),
        ...(category !== undefined && { category }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(isVerified !== undefined && { isVerified }),
        ...(isActive !== undefined && { isActive }),
        ...(monobankJarId !== undefined && { monobankJarId: monobankJarId || null }),
      },
    });

    res.status(200).json(fundraiser);
  } catch (error) {
    console.error('❌ Помилка оновлення фонду:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};
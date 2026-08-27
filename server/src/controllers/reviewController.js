const prisma = require('../prisma');

// POST /api/reviews — клієнт залишає відгук на завершену сесію
exports.createReview = async (req, res) => {
  try {
    const { sessionId, rating, comment } = req.body;

    if (!sessionId || !rating) {
      return res.status(400).json({ message: "Поля 'sessionId' та 'rating' обов'язкові" });
    }
    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ message: 'rating має бути цілим числом від 1 до 5' });
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { review: true },
    });

    if (!session) {
      return res.status(404).json({ message: 'Сесію не знайдено' });
    }
    if (session.clientId !== req.dbUser.id) {
      return res.status(403).json({ message: 'Це не ваша сесія' });
    }
    if (session.status !== 'COMPLETED') {
      return res.status(409).json({ message: 'Залишити відгук можна лише після завершення сесії' });
    }
    if (session.review) {
      return res.status(409).json({ message: 'Відгук для цієї сесії вже залишено' });
    }

    const review = await prisma.review.create({
      data: {
        sessionId,
        clientId: req.dbUser.id,
        specialistId: session.specialistId,
        rating: ratingNum,
        comment: comment || null,
      },
    });

    res.status(201).json(review);
  } catch (error) {
    console.error('❌ Помилка створення відгуку:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

// GET /api/reviews/mine — відгуки, залишені поточним клієнтом
exports.getMyReviews = async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { clientId: req.dbUser.id },
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json(reviews);
  } catch (error) {
    console.error('❌ Помилка отримання відгуків:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

// GET /api/reviews/specialist/:specialistId — публічні відгуки про спеціаліста
exports.getSpecialistReviews = async (req, res) => {
  try {
    const { specialistId } = req.params;
    const reviews = await prisma.review.findMany({
      where: { specialistId },
      include: { client: { select: { firstName: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json(reviews);
  } catch (error) {
    console.error('❌ Помилка отримання відгуків спеціаліста:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

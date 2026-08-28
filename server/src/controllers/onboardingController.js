const prisma = require('../prisma');

// POST /api/onboarding — створити або оновити відповіді анкети клієнта
exports.submitOnboarding = async (req, res) => {
  try {
    const { concerns, preferredGender, urgencyLevel } = req.body;

    if (!Array.isArray(concerns) || concerns.length === 0) {
      return res.status(400).json({ message: "Поле 'concerns' має бути непорожнім масивом" });
    }

    // upsert: якщо анкета вже є — оновлюємо, якщо нема — створюємо
    const answer = await prisma.onboardingAnswer.upsert({
      where: { userId: req.dbUser.id },
      update: {
        concerns,
        preferredGender: preferredGender || null,
        urgencyLevel: urgencyLevel || null,
      },
      create: {
        userId: req.dbUser.id,
        concerns,
        preferredGender: preferredGender || null,
        urgencyLevel: urgencyLevel || null,
      },
    });

    res.status(200).json(answer);
  } catch (error) {
    console.error('❌ Помилка збереження анкети:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

// GET /api/onboarding/mine — отримати власні відповіді анкети
exports.getMyOnboarding = async (req, res) => {
  try {
    const answer = await prisma.onboardingAnswer.findUnique({
      where: { userId: req.dbUser.id },
    });

    if (!answer) {
      return res.status(404).json({ message: 'Анкету ще не заповнено' });
    }

    res.status(200).json(answer);
  } catch (error) {
    console.error('❌ Помилка отримання анкети:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};
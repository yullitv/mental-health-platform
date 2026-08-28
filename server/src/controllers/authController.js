const prisma = require('../prisma');
const { getAuth } = require("@clerk/express");

exports.syncUser = async (req, res) => {
  try {
    // Отримуємо userId через офіційний хелпер getAuth
    const { userId } = getAuth(req);
    const { email, firstName, lastName, role } = req.body;

    console.log("--- DEBUG ---");
    console.log("UserID від Clerk:", userId);

    if (!userId) {
      console.error("❌ Помилка: userId відсутній у токені!");
      return res.status(401).json({ message: "Неавторизований доступ: токен не розпізнано" });
    }

    // Дозволяємо вибір ролі лише між CLIENT і SPECIALIST через публічну
    // реєстрацію. ADMIN ніколи не призначається через цей ендпоінт —
    // тільки вручну в базі.
    const requestedRole = role === 'SPECIALIST' ? 'SPECIALIST' : 'CLIENT';

    const existingUser = await prisma.user.findUnique({ where: { clerkId: userId } });

    let user;

    if (existingUser) {
      // Користувач уже існує — роль зафіксована при першій реєстрації,
      // тут її НЕ змінюємо (щоб CLIENT не міг сам "перевибрати" себе в SPECIALIST).
      user = await prisma.user.update({
        where: { clerkId: userId },
        data: { firstName, lastName },
      });
    } else {
      // Новий користувач — створюємо і, якщо обрано SPECIALIST,
      // одразу заводимо порожній SpecialistProfile у тій самій транзакції.
      user = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            clerkId: userId,
            email: email || `user_${userId}@example.com`,
            firstName,
            lastName,
            role: requestedRole,
          },
        });

        if (requestedRole === 'SPECIALIST') {
          await tx.specialistProfile.create({
            data: { userId: newUser.id },
          });
        }

        return newUser;
      });
    }

    console.log(`✅ Успіх: Користувач ${user.email} синхронізований.`);
    res.status(200).json(user);
  } catch (error) {
    console.error('❌ Помилка синхронізації:', error);
    res.status(500).json({ message: 'Помилка сервера', error: error.message });
  }
};
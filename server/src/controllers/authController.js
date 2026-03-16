const prisma = require('../prisma');
const { getAuth } = require("@clerk/express");

exports.syncUser = async (req, res) => {
  try {
    // Отримуємо userId через офіційний хелпер getAuth
    const { userId } = getAuth(req); 
    const { email, firstName, lastName } = req.body;

    console.log("--- DEBUG ---");
    console.log("UserID від Clerk:", userId);

    if (!userId) {
      console.error("❌ Помилка: userId відсутній у токені!");
      return res.status(401).json({ message: "Неавторизований доступ: токен не розпізнано" });
    }

    const user = await prisma.user.upsert({
      where: { clerkId: userId },
      update: {
        firstName,
        lastName,
      },
      create: {
        clerkId: userId,
        email: email || `user_${userId}@example.com`, // Запасний варіант, якщо email не прийшов
        firstName,
        lastName,
        role: 'CLIENT',
      },
    });

    console.log(`✅ Успіх: Користувач ${user.email} синхронізований.`);
    res.status(200).json(user);
  } catch (error) {
    console.error('❌ Помилка синхронізації:', error);
    res.status(500).json({ message: 'Помилка сервера', error: error.message });
  }
};
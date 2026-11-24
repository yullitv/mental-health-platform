const prisma = require("../prisma");
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
      return res
        .status(401)
        .json({ message: "Неавторизований доступ: токен не розпізнано" });
    }

    const requestedRole = role === "SPECIALIST" ? "SPECIALIST" : "CLIENT";

    const existingUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    let user;

    if (existingUser) {
      user = await prisma.user.update({
        where: { clerkId: userId },
        data: { firstName, lastName },
      });
    } else {
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

        if (requestedRole === "SPECIALIST") {
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
    console.error("❌ Помилка синхронізації:", error);
    res.status(500).json({ message: "Помилка сервера", error: error.message });
  }
};

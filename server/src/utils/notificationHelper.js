const prisma = require("../prisma");
const { getIo } = require("../socket");
const { sendMail } = require("./mailer");

async function createNotification({ userId, type, title, message, link }) {
  try {
    const notification = await prisma.notification.create({
      data: { userId, type, title, message, link },
    });

    try {
      getIo().to(`user:${userId}`).emit("newNotification", notification);
    } catch (ioError) {
      console.error("❌ Socket.io недоступний:", ioError.message);
    }

    prisma.user
      .findUnique({ where: { id: userId }, select: { email: true } })
      .then((user) => {
        if (user?.email) {
          sendMail({ to: user.email, subject: title, text: message });
        }
      })
      .catch((err) =>
        console.error("❌ Не вдалось знайти email користувача:", err.message),
      );
  } catch (error) {
    console.error("❌ Помилка створення сповіщення:", error);
  }
}

module.exports = { createNotification };

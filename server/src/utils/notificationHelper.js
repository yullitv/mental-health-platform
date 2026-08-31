const prisma = require("../prisma");
const { getIo } = require("../socket");
const { sendMail } = require("./mailer");

// Створення сповіщення. Обгорнуто в try/catch, щоб збій сповіщення
// ніколи не ламав основну дію (бронювання, донат, повідомлення).
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

    // Email-дублювання сповіщення. Не блокує основний потік (fire-and-forget)
    // і не ламає нічого при збої — просто лог помилки.
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
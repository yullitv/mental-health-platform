const prisma = require("../prisma");
const { getIo } = require("../socket");

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
  } catch (error) {
    console.error("❌ Помилка створення сповіщення:", error);
  }
}

module.exports = { createNotification };
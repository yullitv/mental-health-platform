const prisma = require("../prisma");

// Створення сповіщення. Обгорнуто в try/catch, щоб збій сповіщення
// ніколи не ламав основну дію (бронювання, донат, повідомлення).
async function createNotification({ userId, type, title, message, link }) {
  try {
    await prisma.notification.create({
      data: { userId, type, title, message, link },
    });
  } catch (error) {
    console.error("❌ Помилка створення сповіщення:", error);
  }
}

module.exports = { createNotification };

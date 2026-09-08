const { Server } = require("socket.io");
const { verifyToken } = require("@clerk/express");
const prisma = require("./prisma");
const { allowedOrigins } = require("./corsConfig");

let io;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: allowedOrigins },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Немає токена"));

      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });
      const user = await prisma.user.findUnique({
        where: { clerkId: payload.sub },
      });
      if (!user) return next(new Error("Користувача не знайдено"));

      socket.dbUser = user;
      next();
    } catch (error) {
      next(new Error("Недійсний токен"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.dbUser.id}`);

    // Перевіряємо, що юзер справді клієнт чи спеціаліст цієї сесії —
    // інакше будь-хто автентифікований міг би підписатись на кімнату
    // чужої сесії, підібравши sessionId, і читати чат у реальному часі.
    socket.on("joinSession", async (sessionId) => {
      try {
        const session = await prisma.session.findUnique({
          where: { id: sessionId },
          include: { specialist: true },
        });
        if (!session) return;

        const isClient = session.clientId === socket.dbUser.id;
        const isSpecialist = session.specialist.userId === socket.dbUser.id;
        if (!isClient && !isSpecialist) return;

        socket.join(`session:${sessionId}`);
      } catch (error) {
        console.error("❌ Помилка приєднання до кімнати сесії:", error);
      }
    });

    socket.on("leaveSession", (sessionId) => {
      socket.leave(`session:${sessionId}`);
    });
  });

  return io;
}

function getIo() {
  if (!io) throw new Error("Socket.io ще не ініціалізовано");
  return io;
}

module.exports = { initSocket, getIo };
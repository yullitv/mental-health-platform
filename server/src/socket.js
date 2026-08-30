const { Server } = require("socket.io");
const { verifyToken } = require("@clerk/express");
const prisma = require("./prisma");

let io;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: "*" },
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

    socket.on("joinSession", (sessionId) => {
      socket.join(`session:${sessionId}`);
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
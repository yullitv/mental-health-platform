// Назва кімнати й пароль для відео-сесії (Jitsi Meet) — детерміновано
// обчислюються з sessionId, однаково в браузерах обох учасників, без
// потреби в бекенді чи обміні даними через сокет.
export function getVideoRoomCredentials(sessionId) {
  return {
    roomName: `opora-session-${sessionId}`,
    password: sessionId.slice(2, 12).toUpperCase(),
  };
}

export function getVideoRoomCredentials(sessionId) {
  return {
    roomName: `opora-session-${sessionId}`,
    password: sessionId.slice(2, 12).toUpperCase(),
  };
}

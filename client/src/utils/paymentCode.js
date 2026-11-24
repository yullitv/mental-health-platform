export function getPaymentCode(sessionId) {
  return sessionId.slice(-6).toUpperCase();
}

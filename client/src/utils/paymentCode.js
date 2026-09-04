// Той самий алгоритм, що на бекенді (server/src/utils/paymentCode.js) —
// код сесії для коментаря до переказу, детермінований з sessionId, без
// запиту на сервер.
export function getPaymentCode(sessionId) {
  return sessionId.slice(-6).toUpperCase();
}

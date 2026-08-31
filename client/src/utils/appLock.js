// Локальний PIN-замок застосунку — це ЗАХИСТ ВІД ВИПАДКОВОГО ПОГЛЯДУ
// (наприклад, хтось узяв телефон у руки), а НЕ шифрування і не заміна
// автентифікації Clerk. PIN не бере участі у шифруванні щоденника чи
// скринінг-тестів (той ключ окремий, живе у diaryCrypto.js) — тому забутий
// PIN можна просто скинути, без втрати жодних даних. Все зберігається лише
// в цьому браузері (localStorage для хеша PIN, sessionStorage — для
// "розблоковано в цій вкладці").

const HASH_KEY = "opora_pin_hash_v1";
const SALT_KEY = "opora_pin_salt_v1";
const UNLOCK_KEY = "opora_unlocked_v1";

function bufToHex(buf) {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomSaltHex() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return bufToHex(bytes.buffer);
}

async function hashPin(pin, salt) {
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(`${salt}:${pin}`));
  return bufToHex(digest);
}

export function hasPinSet() {
  return Boolean(localStorage.getItem(HASH_KEY));
}

export async function setPin(pin) {
  const salt = randomSaltHex();
  const hash = await hashPin(pin, salt);
  localStorage.setItem(SALT_KEY, salt);
  localStorage.setItem(HASH_KEY, hash);
}

export async function verifyPin(pin) {
  const salt = localStorage.getItem(SALT_KEY);
  const storedHash = localStorage.getItem(HASH_KEY);
  if (!salt || !storedHash) return false;
  const hash = await hashPin(pin, salt);
  return hash === storedHash;
}

export function removePin() {
  localStorage.removeItem(HASH_KEY);
  localStorage.removeItem(SALT_KEY);
  sessionStorage.removeItem(UNLOCK_KEY);
}

export function isUnlockedThisSession() {
  return sessionStorage.getItem(UNLOCK_KEY) === "1";
}

export function markUnlocked() {
  sessionStorage.setItem(UNLOCK_KEY, "1");
}

export function markLocked() {
  sessionStorage.removeItem(UNLOCK_KEY);
}

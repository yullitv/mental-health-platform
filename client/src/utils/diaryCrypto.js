// Клієнтське E2E-шифрування записів щоденника (AES-256-GCM, Web Crypto API).
// Ключ ніколи не залишає браузер і не надсилається на сервер — сервер
// зберігає лише незрозумілий шифротекст (cipherText).

const STORAGE_KEY = "diary_encryption_key_v1";

function bufToBase64(buf) {
  let binary = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBuf(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export function getStoredKey() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function storeKey(base64Key) {
  localStorage.setItem(STORAGE_KEY, base64Key);
}

export function clearStoredKey() {
  localStorage.removeItem(STORAGE_KEY);
}

export async function generateKey() {
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
  const raw = await crypto.subtle.exportKey("raw", key);
  return bufToBase64(raw);
}

async function importKey(base64Key) {
  const raw = base64ToBuf(base64Key);
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

// Повертає { key, isNew } — isNew=true, якщо ключ щойно згенеровано
// (немає жодних старих зашифрованих записів, які могли б від нього залежати).
export async function ensureKey(hasExistingEntries) {
  const existing = getStoredKey();
  if (existing) return { key: existing, isNew: false };
  if (hasExistingEntries) return { key: null, isNew: false };
  const fresh = await generateKey();
  storeKey(fresh);
  return { key: fresh, isNew: true };
}

export async function encryptEntry(base64Key, data) {
  const key = await importKey(base64Key);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(data));
  const cipherBuf = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  const combined = new Uint8Array(iv.length + cipherBuf.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipherBuf), iv.length);
  return bufToBase64(combined.buffer);
}

export async function decryptEntry(base64Key, cipherText) {
  const key = await importKey(base64Key);
  const combined = new Uint8Array(base64ToBuf(cipherText));
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return JSON.parse(new TextDecoder().decode(plainBuf));
}

// Пробна розшифровка одного запису — використовується, щоб перевірити,
// чи введений користувачем ключ підходить, перш ніж його зберегти.
export async function tryDecrypt(base64Key, cipherText) {
  try {
    await decryptEntry(base64Key, cipherText);
    return true;
  } catch {
    return false;
  }
}

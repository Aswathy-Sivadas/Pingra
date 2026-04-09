// E2EE utilities using Web Crypto API (ECDH + AES-GCM)
// Keys are stored as exportable JWK in IndexedDB for reliable persistence.

const DB_NAME = "e2ee_keys";
const STORE_NAME = "keyPairs";
const KEY_ID = "myKeyPair";

// ── IndexedDB helpers ──

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 2); // bump version to recreate store
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveJWKs(publicJwk, privateJwk) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({ publicJwk, privateJwk }, KEY_ID);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function loadJWKs() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(KEY_ID);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

// ── Import CryptoKeys from stored JWK ──

// Safe base64 encode/decode for large buffers (avoids call-stack overflow with spread)
function bufToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuf(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function jwkToKeyPair(stored) {
  const publicKey = await window.crypto.subtle.importKey(
    "jwk", stored.publicJwk,
    { name: "ECDH", namedCurve: "P-256" },
    true, []
  );
  const privateKey = await window.crypto.subtle.importKey(
    "jwk", stored.privateJwk,
    { name: "ECDH", namedCurve: "P-256" },
    true, ["deriveKey"]
  );
  return { publicKey, privateKey };
}

// ── Key generation ──

export async function generateKeyPair() {
  const keyPair = await window.crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true, // extractable so we can export to JWK
    ["deriveKey"]
  );

  // export both keys as JWK and store in IndexedDB
  const publicJwk = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const privateJwk = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);
  await saveJWKs(publicJwk, privateJwk);

  // export public key as base64 (raw) for server storage
  const publicKeyRaw = await window.crypto.subtle.exportKey("raw", keyPair.publicKey);
  const publicKeyB64 = bufToBase64(publicKeyRaw);

  return publicKeyB64;
}

// ── Load my key pair from IndexedDB ──

export async function getMyKeyPair() {
  const stored = await loadJWKs();
  if (!stored) return null;
  try {
    return await jwkToKeyPair(stored);
  } catch (err) {
    console.error("Failed to import stored key pair:", err);
    return null;
  }
}

// ── Export my public key as base64 (raw) for comparing with server ──

export async function getMyPublicKeyB64() {
  const kp = await getMyKeyPair();
  if (!kp) return null;
  const raw = await window.crypto.subtle.exportKey("raw", kp.publicKey);
  return bufToBase64(raw);
}

// ── Derive a shared AES-GCM key from my private key + their public key ──

async function importPublicKey(publicKeyB64) {
  const raw = base64ToBuf(publicKeyB64);
  return window.crypto.subtle.importKey(
    "raw", raw,
    { name: "ECDH", namedCurve: "P-256" },
    false, []
  );
}

async function deriveSharedKey(myPrivateKey, theirPublicKeyB64) {
  const theirPublicKey = await importPublicKey(theirPublicKeyB64);
  return window.crypto.subtle.deriveKey(
    { name: "ECDH", public: theirPublicKey },
    myPrivateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// ── Encrypt plaintext → { ciphertext, iv } (both base64) ──

export async function encryptMessage(plaintext, myPrivateKey, theirPublicKeyB64) {
  const sharedKey = await deriveSharedKey(myPrivateKey, theirPublicKeyB64);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const cipherBuf = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    sharedKey,
    encoded
  );
  return {
    ciphertext: bufToBase64(cipherBuf),
    iv: bufToBase64(iv),
  };
}

// ── Decrypt { ciphertext, iv } → plaintext ──

export async function decryptMessage(ciphertextB64, ivB64, myPrivateKey, theirPublicKeyB64) {
  const sharedKey = await deriveSharedKey(myPrivateKey, theirPublicKeyB64);
  const iv = base64ToBuf(ivB64);
  const cipherBuf = base64ToBuf(ciphertextB64);
  const plainBuf = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    sharedKey,
    cipherBuf
  );
  return new TextDecoder().decode(plainBuf);
}

// ── Encrypt image (data URL) → { encryptedImage, imageIv } (both base64) ──

export async function encryptImage(dataUrl, myPrivateKey, theirPublicKeyB64) {
  const sharedKey = await deriveSharedKey(myPrivateKey, theirPublicKeyB64);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  // convert dataURL to raw bytes
  const raw = base64ToBuf(dataUrl.split(",")[1]);
  const cipherBuf = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    sharedKey,
    raw
  );
  // prefix with the mime header so we can reconstruct later
  const mimeHeader = dataUrl.split(",")[0]; // e.g. "data:image/png;base64"
  return {
    encryptedImage: mimeHeader + "," + bufToBase64(cipherBuf),
    imageIv: bufToBase64(iv),
  };
}

// ── Decrypt image → data URL ──

export async function decryptImage(encryptedImage, imageIvB64, myPrivateKey, theirPublicKeyB64) {
  const sharedKey = await deriveSharedKey(myPrivateKey, theirPublicKeyB64);
  const iv = base64ToBuf(imageIvB64);
  const mimeHeader = encryptedImage.split(",")[0];
  const cipherBuf = base64ToBuf(encryptedImage.split(",")[1]);
  const plainBuf = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    sharedKey,
    cipherBuf
  );
  // reconstruct data URL from decrypted raw bytes
  const plainB64 = bufToBase64(plainBuf);
  return mimeHeader + "," + plainB64;
}

// ── Key rotation: generate new key pair, replace stored keys, return new publicKey ──

export async function rotateKeyPair() {
  return generateKeyPair(); // generates, stores in IndexedDB, returns base64 publicKey
}

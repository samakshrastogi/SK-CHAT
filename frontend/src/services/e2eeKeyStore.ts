const DATABASE_NAME = 'sk-connect-e2ee';
const STORE_NAME = 'identity-keys';
const KEY_ID = 'current-device';

export type StoredIdentity = {
  privateKey: CryptoKey;
  publicKey: JsonWebKey;
  fingerprint: string;
};

const openDatabase = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open(DATABASE_NAME, 1);
  request.onupgradeneeded = () => {
    if (!request.result.objectStoreNames.contains(STORE_NAME)) {
      request.result.createObjectStore(STORE_NAME);
    }
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const getStoredIdentity = async (): Promise<StoredIdentity | null> => {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = database.transaction(STORE_NAME).objectStore(STORE_NAME).get(KEY_ID);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
};

const saveIdentity = async (identity: StoredIdentity) => {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(identity, KEY_ID);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

const fingerprint = async (publicKey: JsonWebKey) => {
  const bytes = new TextEncoder().encode(JSON.stringify(publicKey));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
};

export const getOrCreateDeviceIdentity = async (): Promise<StoredIdentity> => {
  const stored = await getStoredIdentity();
  if (stored) return stored;

  const generated = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey'],
  );
  const publicKey = await crypto.subtle.exportKey('jwk', generated.publicKey);
  const privateJwk = await crypto.subtle.exportKey('jwk', generated.privateKey);
  const privateKey = await crypto.subtle.importKey(
    'jwk',
    privateJwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveKey'],
  );
  const identity = { privateKey, publicKey, fingerprint: await fingerprint(publicKey) };
  await saveIdentity(identity);
  return identity;
};

export const formatFingerprint = (value: string) =>
  value.match(/.{1,4}/g)?.slice(0, 12).join(' ') || value;

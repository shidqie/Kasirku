export interface OfflineCacheEntry {
  url: string;
  data: unknown;
  updatedAt: number;
}

export interface OfflineSyncItem {
  id: string;
  url: string;
  method: "POST" | "PATCH" | "PUT" | "DELETE";
  body: string | null;
  label: string;
  createdAt: number;
  status: "PENDING" | "SYNCING" | "FAILED";
  errorMessage?: string;
}

const DB_NAME = "kasirku_offline_db";
const DB_VERSION = 1;
const STORE_CACHE = "api_cache";
const STORE_QUEUE = "sync_queue";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      reject(new Error("IndexedDB tidak tersedia"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_CACHE)) {
        db.createObjectStore(STORE_CACHE, { keyPath: "url" });
      }
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        db.createObjectStore(STORE_QUEUE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Gagal membuka IndexedDB"));
  });
}

export async function idbGetCache(url: string): Promise<OfflineCacheEntry | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_CACHE, "readonly");
      const req = tx.objectStore(STORE_CACHE).get(url);
      req.onsuccess = () => resolve((req.result as OfflineCacheEntry) || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function idbSetCache(url: string, data: unknown): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_CACHE, "readwrite");
      tx.objectStore(STORE_CACHE).put({
        url,
        data,
        updatedAt: Date.now(),
      } satisfies OfflineCacheEntry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Abaikan jika storage penuh atau private mode
  }
}

export async function idbGetAllQueue(): Promise<OfflineSyncItem[]> {
  try {
    const db = await openDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_QUEUE, "readonly");
      const req = tx.objectStore(STORE_QUEUE).getAll();
      req.onsuccess = () => {
        const list = (req.result as OfflineSyncItem[]) || [];
        list.sort((a, b) => a.createdAt - b.createdAt);
        resolve(list);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function idbPutQueueItem(item: OfflineSyncItem): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, "readwrite");
    tx.objectStore(STORE_QUEUE).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("Gagal menyimpan antrean offline"));
  });
}

export async function idbDeleteQueueItem(id: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_QUEUE, "readwrite");
      tx.objectStore(STORE_QUEUE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Abaikan
  }
}

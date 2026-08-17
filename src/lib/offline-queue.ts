export type QueuedMutation = {
  id: string;
  url: string;
  method: string;
  body: string | null;
  createdAt: string;
  label: string;
};

const DB_NAME = "critterops-offline";
const DB_VERSION = 1;
const STORE = "queue";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB unavailable"));
  });
}

function txDone(tx: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
  });
}

export async function enqueueMutation(item: Omit<QueuedMutation, "id" | "createdAt"> & { id?: string; createdAt?: string }) {
  const record: QueuedMutation = {
    id: item.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    url: item.url,
    method: item.method,
    body: item.body,
    createdAt: item.createdAt ?? new Date().toISOString(),
    label: item.label,
  };
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(record);
    await txDone(tx);
  } finally {
    db.close();
  }
  return record;
}

export async function listMutations(): Promise<QueuedMutation[]> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).getAll();
    const rows = await new Promise<QueuedMutation[]>((resolve, reject) => {
      request.onsuccess = () => resolve((request.result as QueuedMutation[]) ?? []);
      request.onerror = () => reject(request.error ?? new Error("Could not read offline queue"));
    });
    await txDone(tx);
    return rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  } finally {
    db.close();
  }
}

export async function removeMutation(id: string) {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    await txDone(tx);
  } finally {
    db.close();
  }
}

export async function mutationCount() {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).count();
    const count = await new Promise<number>((resolve, reject) => {
      request.onsuccess = () => resolve(Number(request.result) || 0);
      request.onerror = () => reject(request.error ?? new Error("Could not count offline queue"));
    });
    await txDone(tx);
    return count;
  } finally {
    db.close();
  }
}

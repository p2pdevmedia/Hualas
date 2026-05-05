export type PendingMutation = {
  id: string;
  url: string;
  method: string;
  body: Record<string, unknown>;
  createdAt: number;
};

const DB_NAME = 'hualas-offline';
const STORE = 'pending-mutations';
const VERSION = 1;

let _db: IDBDatabase | null = null;
let _flushing = false;

function openDb(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => {
      _db = req.result;
      resolve(_db);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function enqueueMutation(
  mutation: Omit<PendingMutation, 'id' | 'createdAt'>,
): Promise<string> {
  const db = await openDb();
  const item: PendingMutation = {
    ...mutation,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).add(item);
    tx.oncomplete = () => {
      window.dispatchEvent(new CustomEvent('hualas-mutation-queued'));
      resolve(item.id);
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllMutations(): Promise<PendingMutation[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () =>
      resolve(
        (req.result as PendingMutation[]).sort(
          (a, b) => a.createdAt - b.createdAt,
        ),
      );
    req.onerror = () => reject(req.error);
  });
}

export async function deleteMutation(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function flushPendingMutations(): Promise<{
  ok: number;
  failed: number;
}> {
  if (_flushing) return { ok: 0, failed: 0 };
  _flushing = true;
  let ok = 0;
  let failed = 0;
  try {
    const mutations = await getAllMutations();
    for (const mutation of mutations) {
      try {
        const res = await fetch(mutation.url, {
          method: mutation.method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mutation.body),
        });
        if (res.ok) {
          await deleteMutation(mutation.id);
          ok++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }
  } finally {
    _flushing = false;
  }
  return { ok, failed };
}

export async function countPendingMutations(): Promise<number> {
  const mutations = await getAllMutations();
  return mutations.length;
}

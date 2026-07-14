const DB_NAME = 'OfflineSyncDB';
const DB_VERSION = 1;

export interface PendingUpload {
  id: string;
  file: File | Blob;
  name: string;
}

export interface PendingRequest {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: any;
  timestamp: string;
  label?: string;
}

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('pending_uploads')) {
        db.createObjectStore('pending_uploads', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('pending_requests')) {
        db.createObjectStore('pending_requests', { keyPath: 'id' });
      }
    };
    request.onsuccess = (e: any) => resolve(e.target.result);
    request.onerror = (e: any) => reject(e.target.error);
  });
}

export async function savePendingUpload(upload: PendingUpload): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending_uploads', 'readwrite');
    const store = tx.objectStore('pending_uploads');
    const req = store.put(upload);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getPendingUpload(id: string): Promise<PendingUpload | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending_uploads', 'readonly');
    const store = tx.objectStore('pending_uploads');
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function deletePendingUpload(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending_uploads', 'readwrite');
    const store = tx.objectStore('pending_uploads');
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function savePendingRequest(req: PendingRequest): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending_requests', 'readwrite');
    const store = tx.objectStore('pending_requests');
    const r = store.put(req);
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
}

export async function getPendingRequests(): Promise<PendingRequest[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending_requests', 'readonly');
    const store = tx.objectStore('pending_requests');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function deletePendingRequest(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending_requests', 'readwrite');
    const store = tx.objectStore('pending_requests');
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

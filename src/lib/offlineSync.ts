/**
 * Offline Data Synchronization & Background Sync API for the Customer App.
 * Uses IndexedDB to queue offline actions (bookings, appointments, enquiries, reviews)
 * and automatically synchronizes them with the backend when network connectivity is restored
 * or when Background Sync triggers.
 */

const DB_NAME = 'nexora_offline_db';
const STORE_NAME = 'action_queue';
const DB_VERSION = 1;

export interface OfflineAction {
  id?: string;
  type: string;
  payload: any;
  timestamp: number;
  retryCount?: number;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this environment.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

export async function queueOfflineAction(type: string, payload: any): Promise<string> {
  if (typeof window === 'undefined') return '';
  try {
    const db = await openDatabase();
    const actionId = await new Promise<string>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const action: OfflineAction = {
        type,
        payload,
        timestamp: Date.now(),
        retryCount: 0
      };
      const request = store.add(action);
      request.onsuccess = () => {
        resolve(String(request.result));
        window.dispatchEvent(new CustomEvent('nexora-offline-queued', { detail: action }));
      };
      request.onerror = () => reject(request.error);
    });

    // Register Background Sync API if supported
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if ('sync' in registration) {
          await (registration as any).sync.register('sync-appointments');
          await (registration as any).sync.register('sync-offline-actions');
        }
      } catch (syncErr) {
        // Background sync registration failed or unsupported, fallback to online event listener
      }
    }

    return actionId;
  } catch (err) {
    console.error('Failed to queue offline action:', err);
    return '';
  }
}

export async function getOfflineQueue(): Promise<OfflineAction[]> {
  if (typeof window === 'undefined') return [];
  try {
    const db = await openDatabase();
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to get offline queue:', err);
    return [];
  }
}

export async function removeOfflineAction(id: any): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(typeof id === 'string' ? Number(id) || id : id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to remove offline action:', err);
  }
}

export async function processOfflineQueue(
  handler: (action: OfflineAction) => Promise<boolean>
): Promise<number> {
  if (typeof window === 'undefined' || !navigator.onLine) return 0;
  const queue = await getOfflineQueue();
  let processedCount = 0;

  for (const item of queue) {
    try {
      const success = await handler(item);
      if (success && item.id !== undefined) {
        await removeOfflineAction(item.id);
        processedCount++;
      }
    } catch (err) {
      console.error('Error processing offline action item:', err);
    }
  }

  if (processedCount > 0) {
    window.dispatchEvent(new CustomEvent('nexora-offline-synced', { detail: { count: processedCount } }));
  }

  return processedCount;
}

// Auto-sync when online event triggers or service worker background sync message received
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    window.dispatchEvent(new CustomEvent('nexora-network-online'));
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'TRIGGER_OFFLINE_SYNC') {
        window.dispatchEvent(new CustomEvent('nexora-background-sync', { detail: event.data }));
      }
    });
  }
}

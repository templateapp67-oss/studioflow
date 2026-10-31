import { openDB } from 'idb';

const DB_NAME = 'SalonWebsiteDB';
const STORE_NAME = 'website-content';

export async function getCachedContent(slug: string) {
  const db = await openDB(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE_NAME);
    },
  });
  return db.get(STORE_NAME, slug);
}

export async function setCachedContent(slug: string, content: any) {
  const db = await openDB(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE_NAME);
    },
  });
  await db.put(STORE_NAME, content, slug);
}

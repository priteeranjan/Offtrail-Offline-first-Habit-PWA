import { openDB } from 'idb';

const DB_NAME = 'offtrail-db';
const DB_VERSION = 1;

export const getDB = () => openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('habits')) {
      const store = db.createObjectStore('habits', { keyPath: 'id', autoIncrement: true });
      store.createIndex('byName', 'name', { unique: false });
    }
    if (!db.objectStoreNames.contains('logs')) {
      const store = db.createObjectStore('logs', { keyPath: 'id', autoIncrement: true });
      store.createIndex('byHabit', 'habitId', { unique: false });
      store.createIndex('byDate', 'date', { unique: false });
    }
    if (!db.objectStoreNames.contains('outbox')) {
      db.createObjectStore('outbox', { keyPath: 'id', autoIncrement: true });
    }
  }
});

export async function addHabit(name, targetPerWeek = 3) {
  const db = await getDB();
  const now = new Date().toISOString();
  return db.add('habits', { name, targetPerWeek, createdAt: now, updatedAt: now });
}

export async function listHabits() {
  const db = await getDB();
  return db.getAll('habits');
}

export async function removeHabit(id) {
  const db = await getDB();
  await db.delete('habits', id);
  // Also remove associated logs
  const logs = await db.getAllFromIndex('logs', 'byHabit', id);
  await Promise.all(logs.map(l => db.delete('logs', l.id)));
}

export async function addLog(habitId, dateISO = new Date().toISOString()) {
  const db = await getDB();
  return db.add('logs', { habitId, date: dateISO });
}

export async function listLogs(habitId) {
  const db = await getDB();
  return db.getAllFromIndex('logs', 'byHabit', habitId);
}

export async function queueSync(op, payload) {
  const db = await getDB();
  return db.add('outbox', { op, payload, ts: Date.now() });
}

export async function drainOutbox(syncFn) {
  const db = await getDB();
  const items = await db.getAll('outbox');
  for (const item of items) {
    try {
      await syncFn(item);
      await db.delete('outbox', item.id);
    } catch (e) {
      // keep in outbox
      console.error('Sync failed, will retry later', e);
    }
  }
}

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { ActiveSession } from './liveTypes';

// Payload per la POST a /api/workouts. Volutamente "shape libera" per
// non accoppiare IDB al tipo Workout (che evolve con le migration server).
export interface PendingWorkout {
  id: string;             // uuid generato lato client
  payload: Record<string, any>;
  failedAt: number;       // epoch ms
  retries: number;
}

interface GtLiveDB extends DBSchema {
  'live-sessions': {
    key: string;
    value: ActiveSession;
  };
  'pending-workouts': {
    key: string;
    value: PendingWorkout;
  };
}

const DB_NAME = 'gt-live';
const DB_VERSION = 2;     // v1 → v2: aggiunto 'pending-workouts' (F6 SPEC §3.6 fallback queue)
const SESSIONS_STORE = 'live-sessions';
const PENDING_STORE = 'pending-workouts';
const ACTIVE_KEY = 'current';

let dbPromise: Promise<IDBPDatabase<GtLiveDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<GtLiveDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
          db.createObjectStore(SESSIONS_STORE);
        }
        if (!db.objectStoreNames.contains(PENDING_STORE)) {
          db.createObjectStore(PENDING_STORE);
        }
      },
    });
  }
  return dbPromise;
}

// ─── live-sessions (v1) ───
export async function getActiveSession(): Promise<ActiveSession | null> {
  if (typeof indexedDB === 'undefined') return null;
  const db = await getDb();
  const result = await db.get(SESSIONS_STORE, ACTIVE_KEY);
  return result ?? null;
}

export async function saveActiveSession(session: ActiveSession): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  const db = await getDb();
  await db.put(SESSIONS_STORE, session, ACTIVE_KEY);
}

export async function clearActiveSession(): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  const db = await getDb();
  await db.delete(SESSIONS_STORE, ACTIVE_KEY);
}

// ─── pending-workouts (v2, F6 fallback queue) ───
export async function enqueuePendingWorkout(entry: PendingWorkout): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  const db = await getDb();
  await db.put(PENDING_STORE, entry, entry.id);
}

export async function listPendingWorkouts(): Promise<PendingWorkout[]> {
  if (typeof indexedDB === 'undefined') return [];
  const db = await getDb();
  return await db.getAll(PENDING_STORE);
}

export async function removePendingWorkout(id: string): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  const db = await getDb();
  await db.delete(PENDING_STORE, id);
}

export async function updatePendingWorkoutRetries(id: string, retries: number): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  const db = await getDb();
  const existing = await db.get(PENDING_STORE, id);
  if (!existing) return;
  await db.put(PENDING_STORE, { ...existing, retries }, id);
}

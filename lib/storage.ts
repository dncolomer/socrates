// ============================================
// STORAGE - Supabase DB + Storage
// Sessions, probes, audio, transcripts, EEG
// ============================================

import { generateId } from "./utils";

// ============================================
// TYPES
// ============================================

export interface Probe {
  id: string;
  timestamp: number; // ms since session start
  gapScore: number;
  signals: string[];
  text: string;
  expandedText?: string;
}

export type SessionStatus = "active" | "completed" | "ended_by_tutor";
export type ObserverMode = "off" | "passive" | "active";
export type Frequency = "rare" | "balanced" | "frequent";

export interface Session {
  id: string;
  problem: string;
  startedAt: string; // ISO string
  endedAt?: string;
  durationMs: number;
  status: SessionStatus;
  probes: Probe[];
  hasAudio: boolean;
  audioPath?: string;
  report?: string;
  reportGeneratedAt?: string;
  metadata: {
    observerMode?: ObserverMode;
    frequency?: Frequency;
    hasEeg?: boolean;
    eegSummary?: Record<string, number> | null;
  };
}

// ============================================
// LOCAL STORAGE (used before Supabase auth)
// After auth, these are replaced by Supabase calls
// ============================================

const SESSIONS_KEY = "socrates-sessions";
const CURRENT_SESSION_KEY = "socrates-current-session";

export function getSessions(): Session[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(SESSIONS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function getSession(id: string): Session | null {
  const sessions = getSessions();
  return sessions.find((s) => s.id === id) || null;
}

export function saveSession(session: Session): void {
  if (typeof window === "undefined") return;
  const sessions = getSessions();
  const existingIndex = sessions.findIndex((s) => s.id === session.id);
  if (existingIndex >= 0) {
    sessions[existingIndex] = session;
  } else {
    sessions.push(session);
  }
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export function deleteSession(id: string): void {
  if (typeof window === "undefined") return;
  const sessions = getSessions().filter((s) => s.id !== id);
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  deleteSessionAudio(id);
}

// ============================================
// CURRENT SESSION (in-progress)
// ============================================

export function getCurrentSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const data = localStorage.getItem(CURRENT_SESSION_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function setCurrentSession(session: Session | null): void {
  if (typeof window === "undefined") return;
  if (session) {
    localStorage.setItem(CURRENT_SESSION_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(CURRENT_SESSION_KEY);
  }
}

export function createSession(problem: string): Session {
  return {
    id: generateId(),
    problem,
    startedAt: new Date().toISOString(),
    durationMs: 0,
    status: "active",
    probes: [],
    hasAudio: false,
    metadata: {},
  };
}

export function addProbeToSession(
  session: Session,
  probe: Omit<Probe, "id">
): Session {
  return {
    ...session,
    probes: [...session.probes, { ...probe, id: generateId() }],
  };
}

export function endSession(session: Session, durationMs: number, status: SessionStatus = "completed"): Session {
  return {
    ...session,
    endedAt: new Date().toISOString(),
    durationMs,
    status,
  };
}

// ============================================
// AUDIO STORAGE (IndexedDB - fallback before Supabase)
// ============================================

const DB_NAME = "socrates-audio";
const DB_VERSION = 1;
const STORE_NAME = "audio";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "sessionId" });
      }
    };
  });
}

export async function saveSessionAudio(sessionId: string, audioBlob: Blob): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    await new Promise<void>((resolve, reject) => {
      const request = store.put({ sessionId, audio: audioBlob });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    db.close();
  } catch (error) {
    console.error("Failed to save audio:", error);
    throw error;
  }
}

export async function getSessionAudio(sessionId: string): Promise<Blob | null> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const result = await new Promise<{ sessionId: string; audio: Blob } | undefined>(
      (resolve, reject) => {
        const request = store.get(sessionId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }
    );
    db.close();
    return result?.audio || null;
  } catch (error) {
    console.error("Failed to get audio:", error);
    return null;
  }
}

export async function deleteSessionAudio(sessionId: string): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    await new Promise<void>((resolve, reject) => {
      const request = store.delete(sessionId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    db.close();
  } catch (error) {
    console.error("Failed to delete audio:", error);
  }
}

// ============================================
// ANALYTICS HELPERS
// ============================================

export function getSessionStats(session: Session) {
  const probeCount = session.probes.length;
  const avgGapScore =
    probeCount > 0
      ? session.probes.reduce((sum, p) => sum + p.gapScore, 0) / probeCount
      : 0;

  const durationMinutes = Math.round(session.durationMs / 60000);
  const probesPerMinute = durationMinutes > 0 ? probeCount / durationMinutes : 0;

  const peakGap = session.probes.reduce(
    (max, p) => (p.gapScore > max.gapScore ? p : max),
    { gapScore: 0 } as Probe
  );

  return {
    probeCount,
    avgGapScore: Math.round(avgGapScore * 100) / 100,
    durationMinutes,
    probesPerMinute: Math.round(probesPerMinute * 10) / 10,
    peakGapScore: peakGap.gapScore,
    peakGapTime: peakGap.timestamp,
  };
}

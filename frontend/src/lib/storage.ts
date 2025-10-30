import { Session, StorageMetadata } from '../types/session';

const STORAGE_KEYS = {
  SESSIONS: 'alex-assist-sessions',
  CURRENT_SESSION: 'alex-assist-current-session',
  METADATA: 'alex-assist-metadata',
} as const;

const STORAGE_LIMITS = {
  MAX_SESSIONS: 20,
  MAX_SIZE_MB: 4, // Warning threshold (80% of 5MB localStorage limit)
  MAX_SESSION_AGE_DAYS: 30,
} as const;

/**
 * Storage error types for better error handling
 */
export class StorageError extends Error {
  constructor(
    message: string,
    public code: 'QUOTA_EXCEEDED' | 'PARSE_ERROR' | 'NOT_FOUND' | 'UNKNOWN'
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

/**
 * Safe JSON parse with error handling
 */
function safeParse<T>(json: string | null, fallback: T): T {
  if (!json) return fallback;

  try {
    return JSON.parse(json) as T;
  } catch (error) {
    console.error('Failed to parse JSON:', error);
    return fallback;
  }
}

/**
 * Calculate size of a string in bytes
 */
function getByteSize(str: string): number {
  return new Blob([str]).size;
}

/**
 * Get current storage metadata
 */
function getMetadata(): StorageMetadata {
  const sessions = getAllSessions();
  const timestamps = sessions.map(s => s.timestamp).sort();

  let totalSize = 0;
  try {
    for (const key in localStorage) {
      if (key.startsWith('alex-assist-')) {
        totalSize += getByteSize(localStorage[key]);
      }
    }
  } catch (error) {
    console.error('Failed to calculate storage size:', error);
  }

  return {
    totalSessions: sessions.length,
    totalSize,
    oldestSession: timestamps[0],
    newestSession: timestamps[timestamps.length - 1],
  };
}

/**
 * Save metadata to localStorage
 */
function saveMetadata(metadata: StorageMetadata): void {
  try {
    localStorage.setItem(STORAGE_KEYS.METADATA, JSON.stringify(metadata));
  } catch (error) {
    console.error('Failed to save metadata:', error);
  }
}

/**
 * Clean up old sessions if limits are exceeded
 */
function cleanupOldSessions(): void {
  const sessions = getAllSessions();

  // Sort by timestamp (oldest first)
  sessions.sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Remove sessions exceeding max count
  if (sessions.length > STORAGE_LIMITS.MAX_SESSIONS) {
    const toRemove = sessions.slice(0, sessions.length - STORAGE_LIMITS.MAX_SESSIONS);
    toRemove.forEach(session => {
      try {
        deleteSession(session.id);
      } catch (error) {
        console.error(`Failed to delete session ${session.id}:`, error);
      }
    });
  }

  // Remove sessions older than max age
  const maxAge = Date.now() - (STORAGE_LIMITS.MAX_SESSION_AGE_DAYS * 24 * 60 * 60 * 1000);
  const oldSessions = sessions.filter(s => new Date(s.timestamp).getTime() < maxAge);
  oldSessions.forEach(session => {
    try {
      deleteSession(session.id);
    } catch (error) {
      console.error(`Failed to delete old session ${session.id}:`, error);
    }
  });
}

/**
 * Get all sessions from storage
 */
export function getAllSessions(): Session[] {
  const sessionsJson = localStorage.getItem(STORAGE_KEYS.SESSIONS);
  return safeParse<Session[]>(sessionsJson, []);
}

/**
 * Get a specific session by ID
 */
export function getSession(id: string): Session | null {
  const sessions = getAllSessions();
  return sessions.find(s => s.id === id) || null;
}

/**
 * Save a session to storage
 */
export function saveSession(session: Session): void {
  try {
    const sessions = getAllSessions();

    // Remove existing session with same ID
    const filtered = sessions.filter(s => s.id !== session.id);

    // Add new/updated session
    filtered.push(session);

    // Save to localStorage
    const sessionsJson = JSON.stringify(filtered);
    localStorage.setItem(STORAGE_KEYS.SESSIONS, sessionsJson);

    // Update metadata
    const metadata = getMetadata();
    saveMetadata(metadata);

    // Check if we need cleanup
    if (metadata.totalSize > STORAGE_LIMITS.MAX_SIZE_MB * 1024 * 1024 * 0.8) {
      console.warn('Storage approaching limit, cleaning up old sessions...');
      cleanupOldSessions();
    }

  } catch (error) {
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      // Try cleanup and retry once
      cleanupOldSessions();

      try {
        const sessions = getAllSessions().filter(s => s.id !== session.id);
        sessions.push(session);
        localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
      } catch (retryError) {
        throw new StorageError(
          'Storage quota exceeded. Please delete some sessions.',
          'QUOTA_EXCEEDED'
        );
      }
    } else {
      throw new StorageError(
        `Failed to save session: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'UNKNOWN'
      );
    }
  }
}

/**
 * Delete a session from storage
 */
export function deleteSession(id: string): void {
  try {
    const sessions = getAllSessions();
    const filtered = sessions.filter(s => s.id !== id);

    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(filtered));

    // Update metadata
    const metadata = getMetadata();
    saveMetadata(metadata);

    // If deleting current session, clear it
    const currentId = getCurrentSessionId();
    if (currentId === id) {
      clearCurrentSession();
    }

  } catch (error) {
    throw new StorageError(
      `Failed to delete session: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'UNKNOWN'
    );
  }
}

/**
 * Get current session ID
 */
export function getCurrentSessionId(): string | null {
  return localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION);
}

/**
 * Set current session ID
 */
export function setCurrentSessionId(id: string): void {
  localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, id);
}

/**
 * Clear current session ID
 */
export function clearCurrentSession(): void {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION);
}

/**
 * Get storage metadata
 */
export function getStorageInfo(): StorageMetadata {
  return getMetadata();
}

/**
 * Export session as JSON file
 */
export function exportSessionToJSON(session: Session): string {
  return JSON.stringify(session, null, 2);
}

/**
 * Import session from JSON string
 */
export function importSessionFromJSON(json: string): Session {
  try {
    const session = JSON.parse(json) as Session;

    // Validate session structure
    if (!session.id || !session.name || !session.timestamp || !Array.isArray(session.widgets)) {
      throw new Error('Invalid session format');
    }

    return session;
  } catch (error) {
    throw new StorageError(
      `Failed to import session: ${error instanceof Error ? error.message : 'Invalid JSON'}`,
      'PARSE_ERROR'
    );
  }
}

/**
 * Clear all sessions (use with caution)
 */
export function clearAllSessions(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.SESSIONS);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION);
    localStorage.removeItem(STORAGE_KEYS.METADATA);
  } catch (error) {
    console.error('Failed to clear sessions:', error);
  }
}

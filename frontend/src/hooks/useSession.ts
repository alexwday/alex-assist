/**
 * Hook for managing dashboard sessions
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Session } from '../types/session';
import {
  getAllSessions,
  getSession,
  saveSession as saveSessionToStorage,
  deleteSession as deleteSessionFromStorage,
  getCurrentSessionId,
  setCurrentSessionId,
  clearCurrentSession,
  StorageError,
} from '../lib/storage';

interface UseSessionOptions {
  /**
   * Enable auto-save (debounced)
   */
  autoSave?: boolean;

  /**
   * Auto-save debounce delay in ms
   */
  autoSaveDelay?: number;
}

interface UseSessionReturn {
  /**
   * All saved sessions
   */
  sessions: Session[];

  /**
   * Currently active session ID
   */
  currentSessionId: string | null;

  /**
   * Currently active session
   */
  currentSession: Session | null;

  /**
   * Save a session
   */
  saveSession: (session: Omit<Session, 'id' | 'timestamp'>) => Promise<string>;

  /**
   * Update an existing session
   */
  updateSession: (id: string, updates: Partial<Omit<Session, 'id'>>) => Promise<void>;

  /**
   * Load a session by ID
   */
  loadSession: (id: string) => Session | null;

  /**
   * Delete a session by ID
   */
  deleteSession: (id: string) => Promise<void>;

  /**
   * Set the current session
   */
  setCurrentSession: (id: string) => void;

  /**
   * Clear current session
   */
  clearSession: () => void;

  /**
   * Refresh sessions list
   */
  refreshSessions: () => void;

  /**
   * Loading state
   */
  isLoading: boolean;

  /**
   * Error state
   */
  error: Error | null;
}

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Hook for managing dashboard sessions
 */
export const useSession = (options: UseSessionOptions = {}): UseSessionReturn => {
  const { autoSave = false, autoSaveDelay = 2000 } = options;

  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load sessions on mount and clear current session
  useEffect(() => {
    loadSessions();
    // Always start with a blank session
    setCurrentSessionIdState(null);
    clearCurrentSession();
  }, []);

  /**
   * Load all sessions from storage
   */
  const loadSessions = useCallback(() => {
    try {
      setIsLoading(true);
      const loadedSessions = getAllSessions();
      setSessions(loadedSessions);
      setError(null);
    } catch (err) {
      setError(err as Error);
      console.error('Failed to load sessions:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Refresh sessions list
   */
  const refreshSessions = useCallback(() => {
    loadSessions();
  }, [loadSessions]);

  /**
   * Get current session
   */
  const currentSession = sessions.find((s) => s.id === currentSessionId) || null;

  /**
   * Save a new or updated session
   */
  const saveSession = useCallback(
    async (sessionData: Omit<Session, 'id' | 'timestamp'>): Promise<string> => {
      try {
        setIsLoading(true);
        setError(null);

        const session: Session = {
          id: generateSessionId(),
          timestamp: new Date().toISOString(),
          ...sessionData,
        };

        saveSessionToStorage(session);

        // Refresh sessions list
        refreshSessions();

        // Set as current session
        setCurrentSessionIdState(session.id);
        setCurrentSessionId(session.id);

        return session.id;
      } catch (err) {
        const error = err as StorageError;
        setError(error);
        console.error('Failed to save session:', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [refreshSessions]
  );

  /**
   * Update an existing session
   */
  const updateSession = useCallback(
    async (id: string, updates: Partial<Omit<Session, 'id'>>): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);

        const existingSession = getSession(id);
        if (!existingSession) {
          throw new StorageError('Session not found', 'NOT_FOUND');
        }

        const updatedSession: Session = {
          ...existingSession,
          ...updates,
          id, // Ensure ID doesn't change
          timestamp: new Date().toISOString(), // Update timestamp
        };

        saveSessionToStorage(updatedSession);

        // Refresh sessions list
        refreshSessions();
      } catch (err) {
        const error = err as StorageError;
        setError(error);
        console.error('Failed to update session:', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [refreshSessions]
  );

  /**
   * Load a session by ID
   */
  const loadSession = useCallback((id: string): Session | null => {
    try {
      const session = getSession(id);
      if (session) {
        setCurrentSessionIdState(id);
        setCurrentSessionId(id);
      }
      return session;
    } catch (err) {
      setError(err as Error);
      console.error('Failed to load session:', err);
      return null;
    }
  }, []);

  /**
   * Delete a session by ID
   */
  const deleteSession = useCallback(
    async (id: string): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);

        deleteSessionFromStorage(id);

        // If deleting current session, clear it
        if (id === currentSessionId) {
          setCurrentSessionIdState(null);
          clearCurrentSession();
        }

        // Refresh sessions list
        refreshSessions();
      } catch (err) {
        const error = err as Error;
        setError(error);
        console.error('Failed to delete session:', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [currentSessionId, refreshSessions]
  );

  /**
   * Set current session
   */
  const setCurrentSession = useCallback((id: string) => {
    setCurrentSessionIdState(id);
    setCurrentSessionId(id);
  }, []);

  /**
   * Clear current session
   */
  const clearSession = useCallback(() => {
    setCurrentSessionIdState(null);
    clearCurrentSession();
  }, []);

  /**
   * Auto-save functionality (debounced)
   */
  useEffect(() => {
    if (!autoSave || !currentSession) return;

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for auto-save
    autoSaveTimeoutRef.current = setTimeout(() => {
      updateSession(currentSession.id, {
        widgets: currentSession.widgets,
      }).catch((err) => {
        console.error('Auto-save failed:', err);
      });
    }, autoSaveDelay);

    // Cleanup
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [autoSave, currentSession, autoSaveDelay, updateSession]);

  return {
    sessions,
    currentSessionId,
    currentSession,
    saveSession,
    updateSession,
    loadSession,
    deleteSession,
    setCurrentSession,
    clearSession,
    refreshSessions,
    isLoading,
    error,
  };
};

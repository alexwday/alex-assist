import React, { createContext, useContext, useCallback, useRef } from 'react';
import { WidgetStateHandler, WidgetState } from '../types/session';

/**
 * Registry of widget state handlers
 */
interface WidgetStateRegistry {
  [widgetId: string]: WidgetStateHandler;
}

/**
 * Context value type
 */
interface WidgetStateContextValue {
  registerWidget: (widgetId: string, handler: WidgetStateHandler) => void;
  unregisterWidget: (widgetId: string) => void;
  getWidgetState: (widgetId: string) => WidgetState | null;
  setWidgetState: (widgetId: string, state: WidgetState) => void;
  getAllWidgetStates: () => Map<string, WidgetState>;
}

const WidgetStateContext = createContext<WidgetStateContextValue | null>(null);

/**
 * Provider component for widget state management
 */
export const WidgetStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const registryRef = useRef<WidgetStateRegistry>({});

  const registerWidget = useCallback((widgetId: string, handler: WidgetStateHandler) => {
    registryRef.current[widgetId] = handler;
  }, []);

  const unregisterWidget = useCallback((widgetId: string) => {
    delete registryRef.current[widgetId];
  }, []);

  const getWidgetState = useCallback((widgetId: string): WidgetState | null => {
    const handler = registryRef.current[widgetId];
    if (!handler) {
      console.warn(`No state handler found for widget: ${widgetId}`);
      return null;
    }

    try {
      return handler.export();
    } catch (error) {
      console.error(`Failed to export state for widget ${widgetId}:`, error);
      return null;
    }
  }, []);

  const setWidgetState = useCallback((widgetId: string, state: WidgetState) => {
    const handler = registryRef.current[widgetId];
    if (!handler) {
      console.warn(`No state handler found for widget: ${widgetId}`);
      return;
    }

    try {
      handler.import(state);
    } catch (error) {
      console.error(`Failed to import state for widget ${widgetId}:`, error);
    }
  }, []);

  const getAllWidgetStates = useCallback((): Map<string, WidgetState> => {
    const states = new Map<string, WidgetState>();

    for (const [widgetId, handler] of Object.entries(registryRef.current)) {
      try {
        const state = handler.export();
        states.set(widgetId, state);
      } catch (error) {
        console.error(`Failed to export state for widget ${widgetId}:`, error);
      }
    }

    return states;
  }, []);

  const value: WidgetStateContextValue = {
    registerWidget,
    unregisterWidget,
    getWidgetState,
    setWidgetState,
    getAllWidgetStates,
  };

  return (
    <WidgetStateContext.Provider value={value}>
      {children}
    </WidgetStateContext.Provider>
  );
};

/**
 * Hook to access widget state context
 */
export const useWidgetStateContext = (): WidgetStateContextValue => {
  const context = useContext(WidgetStateContext);

  if (!context) {
    throw new Error('useWidgetStateContext must be used within WidgetStateProvider');
  }

  return context;
};

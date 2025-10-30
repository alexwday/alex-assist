/**
 * Custom hook for managing widget layout with localStorage persistence
 */

import { useState, useEffect, useCallback } from 'react';
import type { Widget } from '../types/widget';
import { useWidgetStateContext } from '../contexts/WidgetStateContext';
import { WidgetSnapshot } from '../types/session';
import { getDefaultWidgetState, migrateWidgetState } from '../lib/widgetRegistry';

const STORAGE_KEY = 'alex-assist-layout';

const DEFAULT_WIDGETS: Widget[] = [
  {
    id: 'chat-1',
    type: 'chat',
    title: 'AI Assistant',
    layout: { x: 0, y: 0, w: 6, h: 8 },
  },
];

export const useLayout = () => {
  const { getAllWidgetStates, setWidgetState } = useWidgetStateContext();

  const [widgets, setWidgets] = useState<Widget[]>(() => {
    // Load from localStorage on init
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load layout from localStorage:', error);
    }
    return DEFAULT_WIDGETS;
  });

  // Save to localStorage whenever widgets change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
    } catch (error) {
      console.error('Failed to save layout to localStorage:', error);
    }
  }, [widgets]);

  const updateWidgetLayout = useCallback((widgetId: string, layout: Widget['layout']) => {
    setWidgets((prev) =>
      prev.map((widget) =>
        widget.id === widgetId ? { ...widget, layout } : widget
      )
    );
  }, []);

  const addWidget = useCallback((widget: Widget) => {
    setWidgets((prev) => [...prev, widget]);
  }, []);

  const removeWidget = useCallback((widgetId: string) => {
    setWidgets((prev) => prev.filter((widget) => widget.id !== widgetId));
  }, []);

  const resetLayout = useCallback(() => {
    setWidgets(DEFAULT_WIDGETS);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  /**
   * Capture complete snapshot of all widgets (layout + state)
   */
  const captureSnapshot = useCallback((): WidgetSnapshot[] => {
    const widgetStates = getAllWidgetStates();

    return widgets.map((widget) => {
      const state = widgetStates.get(widget.id) || getDefaultWidgetState(widget.type);

      return {
        id: widget.id,
        type: widget.type,
        title: widget.title,
        layout: widget.layout,
        state,
      };
    });
  }, [widgets, getAllWidgetStates]);

  /**
   * Restore widgets from snapshots (layout + state)
   */
  const restoreSnapshot = useCallback((snapshots: WidgetSnapshot[]) => {
    // First, update widget layouts
    const restoredWidgets: Widget[] = snapshots.map((snapshot) => ({
      id: snapshot.id,
      type: snapshot.type,
      title: snapshot.title,
      layout: snapshot.layout,
    }));

    setWidgets(restoredWidgets);

    // Then, restore widget states
    // Note: States will be applied when widgets mount and register themselves
    // We'll store them temporarily and apply them in a useEffect
    setTimeout(() => {
      snapshots.forEach((snapshot) => {
        try {
          const migratedState = migrateWidgetState(snapshot.type, snapshot.state);
          setWidgetState(snapshot.id, migratedState);
        } catch (error) {
          console.error(`Failed to restore state for widget ${snapshot.id}:`, error);
        }
      });
    }, 100); // Small delay to ensure widgets are mounted
  }, [setWidgetState]);

  return {
    widgets,
    updateWidgetLayout,
    addWidget,
    removeWidget,
    resetLayout,
    captureSnapshot,
    restoreSnapshot,
  };
};

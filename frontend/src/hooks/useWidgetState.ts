import { useEffect, useCallback } from 'react';
import { useWidgetStateContext } from '../contexts/WidgetStateContext';
import { WidgetState } from '../types/session';

/**
 * Hook options for widget state management
 */
interface UseWidgetStateOptions {
  /**
   * Function to export widget state
   */
  export: () => WidgetState;

  /**
   * Function to import/restore widget state
   */
  import: (state: WidgetState) => void;

  /**
   * Function to get default widget state
   */
  getDefaultState: () => WidgetState;
}

/**
 * Hook return value
 */
interface UseWidgetStateReturn {
  /**
   * Manually export current state
   */
  exportState: () => WidgetState;

  /**
   * Manually import state
   */
  importState: (state: WidgetState) => void;
}

/**
 * Hook for widgets to register their state with the context
 *
 * This hook automatically registers the widget on mount and unregisters on unmount.
 * It provides methods for the widget to export and import its state.
 *
 * @param widgetId - Unique identifier for the widget
 * @param options - State management callbacks
 * @returns Methods to manually export/import state
 *
 * @example
 * ```tsx
 * const MyWidget = ({ widgetId }) => {
 *   const [data, setData] = useState<string>('');
 *
 *   useWidgetState(widgetId, {
 *     export: () => ({
 *       version: '1.0',
 *       data: { content: data }
 *     }),
 *     import: (state) => {
 *       setData(state.data.content);
 *     },
 *     getDefaultState: () => ({
 *       version: '1.0',
 *       data: { content: '' }
 *     })
 *   });
 *
 *   return <div>{data}</div>;
 * };
 * ```
 */
export const useWidgetState = (
  widgetId: string,
  options: UseWidgetStateOptions
): UseWidgetStateReturn => {
  const { registerWidget, unregisterWidget } = useWidgetStateContext();

  const { export: exportFn, import: importFn, getDefaultState } = options;

  // Register widget on mount, unregister on unmount
  useEffect(() => {
    registerWidget(widgetId, {
      export: exportFn,
      import: importFn,
      getDefaultState,
    });

    return () => {
      unregisterWidget(widgetId);
    };
  }, [widgetId, exportFn, importFn, getDefaultState, registerWidget, unregisterWidget]);

  // Memoized export function
  const exportState = useCallback(() => {
    return exportFn();
  }, [exportFn]);

  // Memoized import function
  const importState = useCallback((state: WidgetState) => {
    importFn(state);
  }, [importFn]);

  return {
    exportState,
    importState,
  };
};

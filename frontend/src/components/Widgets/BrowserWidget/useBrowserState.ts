/**
 * Hook for managing browser widget state
 */

import { useState, useCallback } from 'react';
import { BrowserState } from '../../../types/widget';

const HOME_URL = 'http://info.cern.ch';

export const useBrowserState = (initialUrl: string = HOME_URL) => {
  const [state, setState] = useState<BrowserState>({
    currentUrl: initialUrl,
    history: [initialUrl],
    historyIndex: 0,
    isLoading: false,
    pageTitle: 'New Tab',
  });

  const navigate = useCallback((url: string) => {
    // Ensure URL has protocol
    let fullUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      fullUrl = 'https://' + url;
    }

    setState((prev) => {
      // Create new history by slicing from start to current index + 1 and adding new URL
      const newHistory = [...prev.history.slice(0, prev.historyIndex + 1), fullUrl];
      return {
        ...prev,
        currentUrl: fullUrl,
        history: newHistory,
        historyIndex: newHistory.length - 1,
        isLoading: true,
      };
    });
  }, []);

  const goBack = useCallback(() => {
    setState((prev) => {
      if (prev.historyIndex > 0) {
        const newIndex = prev.historyIndex - 1;
        return {
          ...prev,
          currentUrl: prev.history[newIndex],
          historyIndex: newIndex,
          isLoading: true,
        };
      }
      return prev;
    });
  }, []);

  const goForward = useCallback(() => {
    setState((prev) => {
      if (prev.historyIndex < prev.history.length - 1) {
        const newIndex = prev.historyIndex + 1;
        return {
          ...prev,
          currentUrl: prev.history[newIndex],
          historyIndex: newIndex,
          isLoading: true,
        };
      }
      return prev;
    });
  }, []);

  const goHome = useCallback(() => {
    navigate(HOME_URL);
  }, [navigate]);

  const refresh = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isLoading: true,
    }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState((prev) => ({
      ...prev,
      isLoading: loading,
    }));
  }, []);

  const setPageTitle = useCallback((title: string) => {
    setState((prev) => ({
      ...prev,
      pageTitle: title,
    }));
  }, []);

  const canGoBack = state.historyIndex > 0;
  const canGoForward = state.historyIndex < state.history.length - 1;

  return {
    state,
    navigate,
    goBack,
    goForward,
    goHome,
    refresh,
    setLoading,
    setPageTitle,
    canGoBack,
    canGoForward,
  };
};

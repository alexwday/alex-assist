/**
 * Browser controls component - address bar and navigation buttons
 */

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Home,
  RefreshCw,
  Loader2,
  Send,
} from 'lucide-react';

interface BrowserControlsProps {
  currentUrl: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  onNavigate: (url: string) => void;
  onBack: () => void;
  onForward: () => void;
  onHome: () => void;
  onRefresh: () => void;
  onSendToAI?: () => void;
}

export const BrowserControls: React.FC<BrowserControlsProps> = ({
  currentUrl,
  isLoading,
  canGoBack,
  canGoForward,
  onNavigate,
  onBack,
  onForward,
  onHome,
  onRefresh,
  onSendToAI,
}) => {
  const [urlInput, setUrlInput] = useState(currentUrl);

  // Update input when URL changes externally
  useEffect(() => {
    setUrlInput(currentUrl);
  }, [currentUrl]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      onNavigate(urlInput.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <div className="flex items-center gap-2 p-2 border-b border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
      {/* Navigation buttons */}
      <div className="flex gap-1">
        <button
          onClick={onBack}
          disabled={!canGoBack}
          className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Back"
        >
          <ArrowLeft size={16} />
        </button>
        <button
          onClick={onForward}
          disabled={!canGoForward}
          className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Forward"
        >
          <ArrowRight size={16} />
        </button>
        <button
          onClick={onRefresh}
          className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          title="Refresh"
        >
          {isLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <RefreshCw size={16} />
          )}
        </button>
        <button
          onClick={onHome}
          className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          title="Home"
        >
          <Home size={16} />
        </button>
      </div>

      {/* Address bar */}
      <form onSubmit={handleSubmit} className="flex-1">
        <input
          type="text"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter URL or search..."
          className="w-full px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </form>

      {/* Send to AI button */}
      {onSendToAI && (
        <button
          onClick={onSendToAI}
          className="p-2 rounded bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-800 text-white transition-colors"
          title="Send page to AI assistant"
        >
          <Send size={16} />
        </button>
      )}
    </div>
  );
};

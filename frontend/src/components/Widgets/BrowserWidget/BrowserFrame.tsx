/**
 * Browser frame component - iframe container for displaying web pages
 */

import React, { useEffect, useRef } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';

interface BrowserFrameProps {
  url: string;
  isLoading: boolean;
  onLoadStart: () => void;
  onLoadEnd: () => void;
  onError?: (error: string) => void;
}

const API_BASE_URL = 'http://localhost:8000';

export const BrowserFrame: React.FC<BrowserFrameProps> = ({
  url,
  isLoading,
  onLoadStart,
  onLoadEnd,
  onError,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Construct proxy URL
  const proxyUrl = url ? `${API_BASE_URL}/api/browser/proxy?url=${encodeURIComponent(url)}` : '';

  useEffect(() => {
    if (url) {
      setError(null);
      onLoadStart();
    }
  }, [url, onLoadStart]);

  const handleLoad = () => {
    onLoadEnd();
    setError(null);
  };

  const handleError = () => {
    const errorMessage = 'Failed to load page';
    setError(errorMessage);
    onLoadEnd();
    if (onError) {
      onError(errorMessage);
    }
  };

  return (
    <div className="relative w-full h-full bg-white dark:bg-gray-900">
      {/* Loading indicator */}
      {isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 z-10">
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={32} className="animate-spin text-blue-600" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Loading page...</p>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 z-10">
          <div className="flex flex-col items-center gap-3 max-w-md text-center p-6">
            <AlertCircle size={48} className="text-red-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Failed to Load Page
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {error}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Some sites may block embedding or require special permissions.
            </p>
          </div>
        </div>
      )}

      {/* Iframe */}
      {proxyUrl && (
        <iframe
          ref={iframeRef}
          src={proxyUrl}
          onLoad={handleLoad}
          onError={handleError}
          className="w-full h-full border-0"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
          title="Browser content"
        />
      )}

      {/* Placeholder when no URL */}
      {!proxyUrl && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center text-gray-400 dark:text-gray-600">
            <p className="text-sm">Enter a URL to browse</p>
          </div>
        </div>
      )}
    </div>
  );
};

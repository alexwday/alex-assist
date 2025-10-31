/**
 * Browser frame component - iframe container for displaying web pages
 * Uses client-side fetch + srcdoc to bypass HTTP encoding issues
 */

import React, { useEffect, useRef, useState } from 'react';
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
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Fetch HTML content when URL changes
  useEffect(() => {
    if (!url) {
      setHtmlContent('');
      setError(null);
      return;
    }

    const fetchHtml = async () => {
      onLoadStart();
      setError(null);
      setHtmlContent(''); // Clear previous content

      try {
        console.log('[BrowserFrame] Fetching URL:', url);
        const proxyUrl = `${API_BASE_URL}/api/browser/proxy?url=${encodeURIComponent(url)}`;

        const response = await fetch(proxyUrl);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        console.log('[BrowserFrame] Response headers:', {
          contentType: response.headers.get('content-type'),
          contentLength: response.headers.get('content-length'),
        });

        // Get HTML as text - browser's fetch API handles encoding automatically
        // based on Content-Type header
        const html = await response.text();

        console.log('[BrowserFrame] Received HTML:', {
          length: html.length,
          firstChars: html.substring(0, 100),
        });

        setHtmlContent(html);
        // onLoadEnd will be called by iframe onLoad event
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to load page';
        console.error('[BrowserFrame] Fetch error:', errorMsg);
        setError(errorMsg);
        onLoadEnd();
        if (onError) {
          onError(errorMsg);
        }
      }
    };

    fetchHtml();
  }, [url, onLoadStart, onLoadEnd, onError]);

  const handleIframeLoad = () => {
    console.log('[BrowserFrame] Iframe loaded successfully');
    onLoadEnd();
    setError(null);
  };

  const handleIframeError = () => {
    console.error('[BrowserFrame] Iframe error');
    const errorMessage = 'Failed to render page';
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

      {/* Iframe with srcdoc - bypasses HTTP encoding issues */}
      {htmlContent && !error && (
        <iframe
          ref={iframeRef}
          srcdoc={htmlContent}
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          className="w-full h-full border-0"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
          title="Browser content"
        />
      )}

      {/* Placeholder when no URL */}
      {!url && !htmlContent && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center text-gray-400 dark:text-gray-600">
            <p className="text-sm">Enter a URL to browse</p>
          </div>
        </div>
      )}
    </div>
  );
};

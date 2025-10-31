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
  onNavigate?: (url: string) => void;
}

const API_BASE_URL = 'http://localhost:8000';

export const BrowserFrame: React.FC<BrowserFrameProps> = ({
  url,
  isLoading,
  onLoadStart,
  onLoadEnd,
  onError,
  onNavigate,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Listen for navigation messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Security check - only accept messages from our iframe
      if (event.data?.type === 'IFRAME_NAVIGATE' && onNavigate) {
        const targetUrl = event.data.url;
        console.log('[BrowserFrame] Navigation requested:', targetUrl);
        onNavigate(targetUrl);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onNavigate]);

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

        // Inject navigation script to intercept link clicks and form submissions
        const navigationScript = `
          <script>
            (function() {
              console.log('[IframeScript] Navigation handler initialized');

              // Intercept all link clicks
              document.addEventListener('click', function(e) {
                const target = e.target.closest('a');
                if (target && target.href) {
                  e.preventDefault();
                  console.log('[IframeScript] Link clicked:', target.href);

                  // Send navigation request to parent
                  window.parent.postMessage({
                    type: 'IFRAME_NAVIGATE',
                    url: target.href
                  }, '*');
                }
              }, true);

              // Intercept form submissions
              document.addEventListener('submit', function(e) {
                e.preventDefault();
                const form = e.target;
                console.log('[IframeScript] Form submitted');

                // Get form action URL
                let actionUrl = form.action || window.location.href;
                const method = (form.method || 'GET').toUpperCase();

                console.log('[IframeScript] Form action:', actionUrl, 'method:', method);

                // Only handle GET forms (like search)
                if (method === 'GET') {
                  // Build query string from form data
                  const formData = new FormData(form);
                  const params = new URLSearchParams();

                  for (const [key, value] of formData.entries()) {
                    if (value) {
                      params.append(key, value);
                    }
                  }

                  // Construct full URL
                  const url = new URL(actionUrl);
                  // Replace query params with form params
                  url.search = params.toString();
                  const finalUrl = url.toString();

                  console.log('[IframeScript] Navigating to:', finalUrl);

                  // Send navigation request to parent
                  window.parent.postMessage({
                    type: 'IFRAME_NAVIGATE',
                    url: finalUrl
                  }, '*');
                } else {
                  console.warn('[IframeScript] POST forms not supported, ignoring');
                }
              }, true);

              // Intercept programmatic navigation (window.location changes)
              const originalLocationSetter = Object.getOwnPropertyDescriptor(window.Location.prototype, 'href').set;
              Object.defineProperty(window.location, 'href', {
                set: function(newUrl) {
                  console.log('[IframeScript] window.location.href set to:', newUrl);

                  // Send navigation request to parent
                  window.parent.postMessage({
                    type: 'IFRAME_NAVIGATE',
                    url: newUrl
                  }, '*');

                  // Don't actually change location
                  return newUrl;
                }
              });

              // Intercept window.open() to open in same frame
              const originalOpen = window.open;
              window.open = function(url, target, features) {
                console.log('[IframeScript] window.open called:', url);

                if (url) {
                  // Send navigation request to parent instead
                  window.parent.postMessage({
                    type: 'IFRAME_NAVIGATE',
                    url: url
                  }, '*');
                }

                // Return a fake window object
                return window;
              };
            })();
          </script>
        `;

        // Inject script before closing body tag
        const htmlWithScript = html.replace(/<\/body>/i, navigationScript + '</body>');

        setHtmlContent(htmlWithScript);
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

/**
 * Browser widget component - a functional web browser within the dashboard
 */

import React from 'react';
import { WidgetBase } from '../WidgetBase';
import { BrowserControls } from './BrowserControls';
import { BrowserFrame } from './BrowserFrame';
import { useBrowserState } from './useBrowserState';

interface BrowserWidgetProps {
  widgetId: string;
  title: string;
  initialUrl?: string;
}

export const BrowserWidget: React.FC<BrowserWidgetProps> = ({
  widgetId,
  title,
  initialUrl,
}) => {
  const {
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
  } = useBrowserState(initialUrl);

  const handleSendToAI = async () => {
    try {
      // TODO: Implement scraping and sending to chat
      console.log('Send to AI:', state.currentUrl);

      // Call scrape endpoint
      const response = await fetch('http://localhost:8000/api/browser/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: state.currentUrl,
          include_links: false,
          format_markdown: true,
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('Scraped content:', data.content.substring(0, 200) + '...');
        // TODO: Send to chat widget
        alert('Page scraped! Content will be sent to AI assistant (not yet implemented)');
      } else {
        console.error('Scraping failed:', data.error);
        alert('Failed to scrape page: ' + data.error);
      }
    } catch (error) {
      console.error('Error scraping page:', error);
      alert('Error scraping page');
    }
  };

  return (
    <WidgetBase widgetId={widgetId} title={state.pageTitle || title}>
      <div className="flex flex-col h-full">
        <BrowserControls
          currentUrl={state.currentUrl}
          isLoading={state.isLoading}
          canGoBack={canGoBack}
          canGoForward={canGoForward}
          onNavigate={navigate}
          onBack={goBack}
          onForward={goForward}
          onHome={goHome}
          onRefresh={refresh}
          onSendToAI={handleSendToAI}
        />
        <div className="flex-1 overflow-hidden">
          <BrowserFrame
            url={state.currentUrl}
            isLoading={state.isLoading}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
          />
        </div>
      </div>
    </WidgetBase>
  );
};

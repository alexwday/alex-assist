/**
 * Main dashboard component with grid layout system
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import GridLayout, { Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import { GridOverlay } from './GridOverlay';
import { ChatWidget } from '../Widgets/ChatWidget/ChatWidget';
import { BrowserWidget } from '../Widgets/BrowserWidget/BrowserWidget';
import { SessionSidebar } from '../Sessions/SessionSidebar';
import { WidgetsSidebar } from '../Widgets/WidgetsSidebar';
import { useLayout } from '../../hooks/useLayout';
import { useSession } from '../../hooks/useSession';
import { exportSessionToJSON } from '../../lib/storage';
import type { Widget, WidgetType } from '../../types/widget';

const GRID_COLS = 12;
const MARGIN = 10;
const CONTAINER_PADDING = 10;
const LEFT_RESERVED_SPACE = 100; // Space for session button

export const Dashboard = () => {
  const { widgets, updateWidgetLayout, addWidget, removeWidget, captureSnapshot, restoreSnapshot, resetLayout } = useLayout();
  const {
    sessions,
    currentSessionId,
    saveSession,
    loadSession,
    deleteSession,
    updateSession,
  } = useSession();

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [gridWidth, setGridWidth] = useState(window.innerWidth - LEFT_RESERVED_SPACE);
  const [gridHeight, setGridHeight] = useState(window.innerHeight);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isWidgetsSidebarOpen, setIsWidgetsSidebarOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Session management handlers
  const handleSaveSession = useCallback(
    async (name: string, description?: string) => {
      const snapshot = captureSnapshot();
      await saveSession({
        name,
        description,
        widgets: snapshot,
      });
      // Reset to blank state after saving
      resetLayout();
    },
    [captureSnapshot, saveSession, resetLayout]
  );

  const handleLoadSession = useCallback(
    async (id: string) => {
      // Save current session before switching
      if (currentSessionId) {
        const snapshot = captureSnapshot();
        await updateSession(currentSessionId, {
          widgets: snapshot,
        }).catch((err) => console.error('Failed to save current session:', err));
      }

      const session = loadSession(id);
      if (session) {
        restoreSnapshot(session.widgets);
      }
    },
    [loadSession, restoreSnapshot, currentSessionId, captureSnapshot, updateSession]
  );

  const handleDeleteSession = useCallback(
    async (id: string) => {
      await deleteSession(id);
    },
    [deleteSession]
  );

  const handleExportSession = useCallback((id: string) => {
    const session = sessions.find((s) => s.id === id);
    if (session) {
      const json = exportSessionToJSON(session);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${session.name.replace(/\s+/g, '-')}-session.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [sessions]);

  // Auto-save current session when widgets change (layout changes)
  useEffect(() => {
    if (!currentSessionId) return;

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for auto-save (debounced)
    autoSaveTimeoutRef.current = setTimeout(() => {
      const snapshot = captureSnapshot();
      updateSession(currentSessionId, {
        widgets: snapshot,
      }).catch((err) => {
        console.error('Auto-save failed:', err);
      });
    }, 2000); // 2 second debounce

    // Cleanup
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [widgets, currentSessionId, captureSnapshot, updateSession]);

  // Periodic auto-save for widget state changes (e.g., chat messages)
  useEffect(() => {
    if (!currentSessionId) return;

    const interval = setInterval(() => {
      const snapshot = captureSnapshot();
      updateSession(currentSessionId, {
        widgets: snapshot,
      }).catch((err) => {
        console.error('Periodic auto-save failed:', err);
      });
    }, 2000); // Auto-save every 2 seconds

    return () => clearInterval(interval);
  }, [currentSessionId, captureSnapshot, updateSession]);

  // Calculate row height to make square cells
  // Formula: (width - 2*containerPadding - (cols-1)*margin) / cols
  const columnWidth = (gridWidth - 2 * CONTAINER_PADDING - (GRID_COLS - 1) * MARGIN) / GRID_COLS;
  const ROW_HEIGHT = Math.floor(columnWidth); // Make squares

  // Calculate how many complete rows fit in the viewport
  const maxRows = Math.floor((gridHeight - 2 * CONTAINER_PADDING + MARGIN) / (ROW_HEIGHT + MARGIN));

  // Update grid dimensions on window resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setGridWidth(containerRef.current.offsetWidth);
        setGridHeight(containerRef.current.offsetHeight);
      }
    };

    handleResize(); // Initial calculation
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Show grid when dragging or resizing
  const showGrid = isDragging || isResizing;

  // Force layout recalculation when maxRows changes (window height changes)
  useEffect(() => {
    // Trigger a layout update by constraining widgets to new maxRows
    widgets.forEach((widget) => {
      const constrainedY = Math.min(widget.layout.y, Math.max(0, maxRows - widget.layout.h));
      if (constrainedY !== widget.layout.y) {
        updateWidgetLayout(widget.id, {
          ...widget.layout,
          y: constrainedY,
        });
      }
    });
  }, [maxRows]);

  // Convert widgets to react-grid-layout format
  // Ensure widget positions are within bounds
  const layout: Layout[] = widgets.map((widget) => {
    // Constrain y position to fit within maxRows
    const constrainedY = Math.min(widget.layout.y, Math.max(0, maxRows - widget.layout.h));
    const constrainedX = Math.min(widget.layout.x, Math.max(0, GRID_COLS - widget.layout.w));

    // Ensure widget height doesn't exceed available viewport rows
    const maxHeightForPosition = maxRows - constrainedY;
    const constrainedH = Math.min(widget.layout.h, maxHeightForPosition);

    return {
      i: widget.id,
      x: constrainedX,
      y: constrainedY,
      w: widget.layout.w,
      h: constrainedH,
    };
  });

  const handleLayoutChange = (newLayout: Layout[]) => {
    // Update widget positions with boundary constraints
    newLayout.forEach((layoutItem) => {
      const widget = widgets.find((w) => w.id === layoutItem.i);
      if (widget) {
        // Constrain to grid boundaries
        const constrainedX = Math.max(0, Math.min(layoutItem.x, GRID_COLS - layoutItem.w));
        const constrainedY = Math.max(0, Math.min(layoutItem.y, maxRows - layoutItem.h));

        // Ensure height fits in remaining rows
        const maxHeightForPosition = maxRows - constrainedY;
        const constrainedH = Math.min(layoutItem.h, maxHeightForPosition);

        updateWidgetLayout(widget.id, {
          x: constrainedX,
          y: constrainedY,
          w: layoutItem.w,
          h: constrainedH,
        });
      }
    });
  };

  const handleDrag = (
    layout: Layout[],
    oldItem: Layout,
    newItem: Layout,
    placeholder: Layout,
    event: MouseEvent,
    element: HTMLElement
  ) => {
    // Constrain during drag in real-time
    const maxY = maxRows - newItem.h;
    const maxX = GRID_COLS - newItem.w;

    if (newItem.y > maxY) {
      newItem.y = maxY;
    }
    if (newItem.y < 0) {
      newItem.y = 0;
    }
    if (newItem.x > maxX) {
      newItem.x = maxX;
    }
    if (newItem.x < 0) {
      newItem.x = 0;
    }
  };

  // Handle adding new widgets
  const handleAddWidget = useCallback((type: WidgetType) => {
    const widgetId = `${type}-${Date.now()}`;
    const newWidget: Widget = {
      id: widgetId,
      type,
      title: type === 'chat' ? 'AI Assistant' : type === 'browser' ? 'Browser' : 'Widget',
      layout: { x: 0, y: 0, w: 6, h: 8 }, // Default size and position
    };
    addWidget(newWidget);
  }, [addWidget]);

  const renderWidget = (widget: Widget) => {
    const handleClose = () => removeWidget(widget.id);

    switch (widget.type) {
      case 'chat':
        return <ChatWidget widgetId={widget.id} title={widget.title} onClose={handleClose} />;
      case 'browser':
        return <BrowserWidget widgetId={widget.id} title={widget.title} onClose={handleClose} />;
      default:
        return <div>Unknown widget type</div>;
    }
  };

  return (
    <div className="dashboard-container relative h-screen w-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Session Sidebar */}
      <SessionSidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onLoadSession={handleLoadSession}
        onSaveSession={handleSaveSession}
        onDeleteSession={handleDeleteSession}
        onExportSession={handleExportSession}
        isOpen={isSidebarOpen}
        onToggle={() => {
          setIsSidebarOpen(!isSidebarOpen);
          if (!isSidebarOpen) setIsWidgetsSidebarOpen(false); // Close widgets sidebar when opening sessions
        }}
      />

      {/* Widgets Sidebar */}
      <WidgetsSidebar
        isOpen={isWidgetsSidebarOpen}
        onToggle={() => {
          setIsWidgetsSidebarOpen(!isWidgetsSidebarOpen);
          if (!isWidgetsSidebarOpen) setIsSidebarOpen(false); // Close sessions sidebar when opening widgets
        }}
        onAddWidget={handleAddWidget}
      />

      {/* Grid container with left offset */}
      <div
        ref={containerRef}
        className="absolute top-0 right-0 bottom-0 h-screen overflow-hidden"
        style={{ left: `${LEFT_RESERVED_SPACE}px` }}
      >
        {/* Grid overlay - only visible during drag/resize */}
        {showGrid && (
          <GridOverlay
            cols={GRID_COLS}
            rows={maxRows}
            rowHeight={ROW_HEIGHT}
            margin={MARGIN}
            containerPadding={CONTAINER_PADDING}
          />
        )}

        <GridLayout
          className="layout"
          layout={layout}
          cols={GRID_COLS}
          rowHeight={ROW_HEIGHT}
          width={gridWidth}
          maxRows={maxRows} // Set container height
          onLayoutChange={handleLayoutChange}
          onDrag={handleDrag} // Constrain during drag
          onDragStart={() => setIsDragging(true)}
          onDragStop={() => setIsDragging(false)}
          onResizeStart={() => setIsResizing(true)}
          onResizeStop={() => setIsResizing(false)}
          draggableHandle=".widget-header"
          isResizable={true}
          isDraggable={true}
          resizeHandles={['se', 'sw']} // Enable both bottom corners
          compactType={null} // Prevent auto-compacting
          preventCollision={false} // Allow overlapping
          margin={[MARGIN, MARGIN]}
          containerPadding={[CONTAINER_PADDING, CONTAINER_PADDING]}
          useCSSTransforms={true}
        >
          {widgets.map((widget) => (
            <div key={widget.id} className="widget-wrapper">
              {renderWidget(widget)}
            </div>
          ))}
        </GridLayout>
      </div>
    </div>
  );
};

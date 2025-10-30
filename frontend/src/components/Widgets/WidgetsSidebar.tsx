/**
 * Widgets sidebar component for browsing and adding widgets to the dashboard
 */

import React from 'react';
import { PanelLeftClose, PanelLeftOpen, Blocks, X, Globe, MessageSquare } from 'lucide-react';
import type { WidgetType } from '../../types/widget';

interface WidgetsSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onAddWidget: (type: WidgetType) => void;
}

interface AvailableWidget {
  type: WidgetType;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const AVAILABLE_WIDGETS: AvailableWidget[] = [
  {
    type: 'chat',
    name: 'AI Chat',
    description: 'Chat with Claude AI assistant',
    icon: <MessageSquare size={24} />,
    color: 'bg-blue-500',
  },
  {
    type: 'browser',
    name: 'Browser',
    description: 'Browse the web and send pages to AI',
    icon: <Globe size={24} />,
    color: 'bg-green-500',
  },
];

export const WidgetsSidebar: React.FC<WidgetsSidebarProps> = ({
  isOpen,
  onToggle,
  onAddWidget,
}) => {
  const handleAddWidget = (type: WidgetType) => {
    onAddWidget(type);
    onToggle(); // Close sidebar after adding
  };

  return (
    <>
      {/* Toggle button - only visible when sidebar is closed */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed left-4 top-[88px] z-40 flex flex-col items-center gap-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-800 text-white rounded-lg shadow-lg transition-colors"
          title="Open widgets panel"
        >
          <Blocks size={20} />
          <span className="text-[10px] font-medium">Widgets</span>
        </button>
      )}

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-full w-80 bg-white dark:bg-gray-800 border-r border-gray-300 dark:border-gray-600 shadow-xl transition-transform duration-300 z-50 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-300 dark:border-gray-600">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Widgets
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Click to add widgets to your dashboard
                </p>
              </div>
              <button
                onClick={onToggle}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                title="Close sidebar"
              >
                <X size={20} className="text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Widget list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {AVAILABLE_WIDGETS.map((widget) => (
              <button
                key={widget.type}
                onClick={() => handleAddWidget(widget.type)}
                className="w-full p-4 rounded-lg border-2 border-gray-200 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 bg-gray-50 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all cursor-pointer text-left"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${widget.color} text-white`}>
                    {widget.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {widget.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {widget.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30"
          onClick={onToggle}
        />
      )}
    </>
  );
};

/**
 * Widgets sidebar component for browsing and adding widgets to the dashboard
 */

import React from 'react';
import { PanelLeftClose, PanelLeftOpen, Blocks, X } from 'lucide-react';

interface WidgetsSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const WidgetsSidebar: React.FC<WidgetsSidebarProps> = ({
  isOpen,
  onToggle,
}) => {
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
                  Drag widgets to your dashboard
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

          {/* Widget list - placeholder for now */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Blocks size={48} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No widgets available yet</p>
              <p className="text-xs mt-1">Coming soon...</p>
            </div>
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

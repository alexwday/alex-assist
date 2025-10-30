/**
 * Base widget component with header and content area
 */

import { X, Minus } from 'lucide-react';
import type { ReactNode } from 'react';

interface WidgetBaseProps {
  id: string;
  title: string;
  onClose?: () => void;
  onMinimize?: () => void;
  children: ReactNode;
}

export const WidgetBase = ({
  title,
  onClose,
  onMinimize,
  children,
}: WidgetBaseProps) => {
  return (
    <div className="widget-base h-full flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Draggable header */}
      <div className="widget-header flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 cursor-move select-none">
        <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-200">
          {title}
        </h3>
        <div className="flex gap-2">
          {onMinimize && (
            <button
              onClick={onMinimize}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              aria-label="Minimize"
            >
              <Minus size={14} />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              aria-label="Close"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Widget content */}
      <div className="widget-content flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
};

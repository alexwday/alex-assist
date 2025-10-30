/**
 * Session sidebar component for managing saved dashboard sessions
 */

import React, { useState } from 'react';
import {
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Save,
  Clock,
  Trash2,
  Download,
  X,
} from 'lucide-react';
import { Session } from '../../types/session';
import { formatDistanceToNow } from '../../lib/dateUtils';

interface SessionSidebarProps {
  sessions: Session[];
  currentSessionId: string | null;
  onLoadSession: (id: string) => void;
  onSaveSession: (name: string, description?: string) => void;
  onDeleteSession: (id: string) => void;
  onExportSession: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const SessionSidebar: React.FC<SessionSidebarProps> = ({
  sessions,
  currentSessionId,
  onLoadSession,
  onSaveSession,
  onDeleteSession,
  onExportSession,
  isOpen,
  onToggle,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [newSessionDescription, setNewSessionDescription] = useState('');

  const handleCreateSession = () => {
    if (!newSessionName.trim()) return;

    onSaveSession(newSessionName.trim(), newSessionDescription.trim() || undefined);
    setIsCreating(false);
    setNewSessionName('');
    setNewSessionDescription('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCreateSession();
    } else if (e.key === 'Escape') {
      setIsCreating(false);
      setNewSessionName('');
      setNewSessionDescription('');
    }
  };

  // Sort sessions by timestamp (newest first)
  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <>
      {/* Toggle button - only visible when sidebar is closed */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed left-4 top-4 z-40 flex flex-col items-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-lg shadow-lg transition-colors"
          title="Open sidebar"
        >
          <PanelLeftOpen size={20} />
          <span className="text-[10px] font-medium">Sessions</span>
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
                  Sessions
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Manage your dashboard states
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

          {/* Session list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {sortedSessions.length === 0 && !isCreating && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Save size={48} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No sessions saved yet</p>
                <p className="text-xs mt-1">Click below to create one</p>
              </div>
            )}

            {sortedSessions.map((session) => (
              <SessionItem
                key={session.id}
                session={session}
                isActive={session.id === currentSessionId}
                onLoad={() => onLoadSession(session.id)}
                onDelete={() => onDeleteSession(session.id)}
                onExport={() => onExportSession(session.id)}
              />
            ))}

            {/* Create new session form */}
            {isCreating && (
              <div className="p-3 border-2 border-blue-500 dark:border-blue-400 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <input
                  type="text"
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Session name..."
                  autoFocus
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
                <textarea
                  value={newSessionDescription}
                  onChange={(e) => setNewSessionDescription(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Description (optional)..."
                  rows={2}
                  className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded mb-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateSession}
                    disabled={!newSessionName.trim()}
                    className="flex-1 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setIsCreating(false);
                      setNewSessionName('');
                      setNewSessionDescription('');
                    }}
                    className="px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="p-4 border-t border-gray-300 dark:border-gray-600 space-y-2">
            <button
              onClick={() => setIsCreating(true)}
              disabled={isCreating}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={18} />
              New Session
            </button>
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

interface SessionItemProps {
  session: Session;
  isActive: boolean;
  onLoad: () => void;
  onDelete: () => void;
  onExport: () => void;
}

const SessionItem: React.FC<SessionItemProps> = ({
  session,
  isActive,
  onLoad,
  onDelete,
  onExport,
}) => {
  const [showActions, setShowActions] = useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Delete session "${session.name}"?`)) {
      onDelete();
    }
  };

  const handleExport = (e: React.MouseEvent) => {
    e.stopPropagation();
    onExport();
  };

  return (
    <div
      className={`p-3 rounded-lg border cursor-pointer transition-all ${
        isActive
          ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-500 dark:border-blue-400'
          : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
      }`}
      onClick={onLoad}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm text-gray-900 dark:text-white truncate">
            {session.name}
          </h3>
          {session.description && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
              {session.description}
            </p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {formatDistanceToNow(new Date(session.timestamp))}
            </span>
            <span>{session.widgets.length} widgets</span>
          </div>
        </div>

        {/* Actions */}
        {showActions && !isActive && (
          <div className="flex gap-1">
            <button
              onClick={handleExport}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
              title="Export session"
            >
              <Download size={14} />
            </button>
            <button
              onClick={handleDelete}
              className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded transition-colors"
              title="Delete session"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

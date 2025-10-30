import { Widget, WidgetLayout } from './widget';

/**
 * Base widget state interface - all widget states must implement this
 */
export interface WidgetState {
  version: string;
  data: unknown;
}

/**
 * Chat widget specific state
 */
export interface ChatWidgetState extends WidgetState {
  version: '1.0';
  data: {
    messages: Array<{
      role: 'user' | 'assistant' | 'system';
      content: string;
      timestamp?: string; // ISO string for serialization
    }>;
    model?: string;
  };
}

/**
 * Complete snapshot of a widget including layout and state
 */
export interface WidgetSnapshot {
  id: string;
  type: Widget['type'];
  title: string;
  layout: WidgetLayout;
  state: WidgetState;
}

/**
 * Session containing complete dashboard state
 */
export interface Session {
  id: string;
  name: string;
  timestamp: string; // ISO string for serialization
  description?: string;
  widgets: WidgetSnapshot[];
}

/**
 * Widget state handler interface - each widget type implements this
 */
export interface WidgetStateHandler {
  export: () => WidgetState;
  import: (state: WidgetState) => void;
  getDefaultState: () => WidgetState;
}

/**
 * Storage metadata for managing storage quota
 */
export interface StorageMetadata {
  totalSessions: number;
  totalSize: number; // in bytes
  oldestSession?: string; // ISO timestamp
  newestSession?: string; // ISO timestamp
}

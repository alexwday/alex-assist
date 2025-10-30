import { WidgetType } from '../types/widget';
import { WidgetState, ChatWidgetState } from '../types/session';

/**
 * Default state generators for each widget type
 */
export const widgetDefaultStates: Record<WidgetType, () => WidgetState> = {
  chat: (): ChatWidgetState => ({
    version: '1.0',
    data: {
      messages: [],
    },
  }),

  // Placeholders for future widget types
  browser: (): WidgetState => ({
    version: '1.0',
    data: {
      url: '',
      history: [],
    },
  }),

  files: (): WidgetState => ({
    version: '1.0',
    data: {
      currentPath: '/',
      openFiles: [],
    },
  }),

  thinking: (): WidgetState => ({
    version: '1.0',
    data: {
      content: '',
      expanded: true,
    },
  }),
};

/**
 * Get default state for a widget type
 */
export function getDefaultWidgetState(type: WidgetType): WidgetState {
  const generator = widgetDefaultStates[type];

  if (!generator) {
    console.warn(`No default state generator found for widget type: ${type}`);
    return {
      version: '1.0',
      data: {},
    };
  }

  return generator();
}

/**
 * Validate widget state structure
 */
export function validateWidgetState(state: unknown): state is WidgetState {
  if (typeof state !== 'object' || state === null) {
    return false;
  }

  const s = state as WidgetState;

  if (typeof s.version !== 'string' || !s.version) {
    return false;
  }

  if (typeof s.data === 'undefined') {
    return false;
  }

  return true;
}

/**
 * Migrate widget state to latest version if needed
 * This is a placeholder for future migration logic
 */
export function migrateWidgetState(
  type: WidgetType,
  state: WidgetState
): WidgetState {
  // For now, just validate and return the state
  // In the future, add version-specific migration logic here

  if (!validateWidgetState(state)) {
    console.warn(`Invalid state for widget type ${type}, using default`);
    return getDefaultWidgetState(type);
  }

  return state;
}

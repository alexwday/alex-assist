/**
 * Widget type definitions
 */

export type WidgetType = 'chat' | 'browser' | 'files' | 'thinking';

export interface WidgetLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  layout: WidgetLayout;
}

export interface WidgetConfig {
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

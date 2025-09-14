export interface PanelConfig {
  id: string;
  type: 'empty' | 'internal' | 'external';
  contentType?: string;
  title?: string;
  props?: Record<string, any>;
  url?: string;
}

export interface WorkspaceLayoutConfig {
  id: string;
  name: string;
  gridCols: number;
  gridRows: number;
  panels: PanelConfig[];
  created_at?: string;
  updated_at?: string;
}
export type Layout = 'simple' | 'audio' | 'marker' | 'timeline' | 'stamp' | 'chromeless' | 'editorial';

export type SidecarType = 'audio' | 'text' | 'marker' | 'thumbnail' | 'observation';

export type ChartType = 'bar_chart' | 'line_chart' | 'led_chart';

export interface TrackVisualization {
  chart_type?: ChartType;
  read_only?: boolean;
  color?: string;
  y_min?: number;
  y_max?: number;
}

export interface MainMedia {
  id?: string;
  label?: string;
  url: string;
  frame_rate?: string | number;
  drop_frame?: boolean;
  ffom?: string;
}

export interface SidecarMedia {
  id?: string;
  label?: string;
  type: SidecarType;
  url: string;
}

export interface Presentation {
  layouts: Layout[];
  read_only?: boolean;
  track_visualization?: Record<string, TrackVisualization>;
  disable_media_fly_outs?: boolean;
}

export interface Media {
  main: MainMedia[];
  sidecars?: SidecarMedia[];
}

export interface SessionData {
  presentation?: Presentation;
  media?: Media;
}

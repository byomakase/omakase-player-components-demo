export type Layout = 'simple' | 'audio' | 'marker' | 'timeline' | 'stamp';

export type SidecarType = 'audio' | 'text' | 'marker' | 'thumbnail';

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
}

export interface Media {
  main: MainMedia[];
  sidecars?: SidecarMedia[];
}

export interface SessionData {
  presentation?: Presentation;
  media?: Media;
}

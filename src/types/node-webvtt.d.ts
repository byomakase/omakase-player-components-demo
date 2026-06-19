declare module 'node-webvtt' {
  interface VttCue {
    identifier?: string | number | null;
    start: number;
    end: number;
    text: string;
    styles?: string;
  }

  interface VttDocument {
    valid: boolean;
    meta?: Record<string, string>;
    cues: VttCue[];
  }

  export function compile(input: VttDocument): string;
  export function parse(input: string): VttDocument;
}

import {SpanTemporal, TextCue, TimedItemTemporalType} from '@byomakase/omakase-player';
import {compile} from 'node-webvtt';

export class VttUtil {
  static createBlobUrl(cues: TextCue[]): string {
    const vttCues = cues
      .filter((cue) => cue.temporal.type === TimedItemTemporalType.SPAN)
      .map((cue) => {
        const span = cue.temporal as SpanTemporal;
        return {
          identifier: cue.id,
          start: parseFloat(span.start),
          end: parseFloat(span.end),
          text: cue.text,
          styles: '',
        };
      });

    const vttString: string = compile({valid: true, cues: vttCues});
    const blob = new Blob([vttString], {type: 'text/vtt'});
    return URL.createObjectURL(blob);
  }
}

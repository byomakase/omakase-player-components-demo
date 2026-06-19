import {FileFormat, OmakasePlayer, PlayerTextHandlerType} from '@byomakase/omakase-player';
import {map, Observable, switchMap} from 'rxjs';

export class ProbingUtil {
  static resolveTextEngine(omakasePlayer: OmakasePlayer, url: string): Observable<PlayerTextHandlerType | undefined> {
    return omakasePlayer.tools.probe(url).pipe(
      map((mediaProbeResult) => {
        if (mediaProbeResult?.fileFormat && [FileFormat.TTML, FileFormat.SCC].includes(mediaProbeResult.fileFormat)) {
          return PlayerTextHandlerType.IMSC;
        } else if (mediaProbeResult?.fileFormat && [FileFormat.VTT].includes(mediaProbeResult.fileFormat)) {
          return PlayerTextHandlerType.MEDIA_CAPTIONS;
        } else if (mediaProbeResult?.fileFormat && [FileFormat.SRT, FileFormat.ASS].includes(mediaProbeResult.fileFormat)) {
          return PlayerTextHandlerType.MEDIA_CAPTIONS;
        } else {
          return undefined;
        }
      })
    );
  }

  static resolveFileFormat(omakasePlayer: OmakasePlayer, url: string): Observable<FileFormat | undefined> {
    return omakasePlayer.tools.probe(url).pipe(
      map((mediaProbeResult) => {
        return mediaProbeResult?.fileFormat;
      })
    );
  }
}

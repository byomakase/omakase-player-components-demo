import {signal} from '@angular/core';
import {OmakasePlayer, OmakasePlayerConfig} from '@byomakase/omakase-player';
import {BehaviorSubject, Observable} from 'rxjs';

export abstract class AbstractPlayerService {
  abstract onCreated$: BehaviorSubject<OmakasePlayer | undefined>;
  abstract thumbnailTrackUrl: ReturnType<typeof signal<string | undefined>>;

  abstract create(config?: Partial<OmakasePlayerConfig>): Observable<OmakasePlayer>;
  abstract setThumbnailTrack(url: string | undefined): void;
  abstract destroy(shouldReload?: boolean): void;

  abstract get isReloading(): boolean;
  abstract get omakasePlayer(): OmakasePlayer | undefined;
}

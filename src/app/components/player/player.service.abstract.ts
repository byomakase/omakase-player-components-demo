import {signal} from '@angular/core';
import {MainMediaType, OmakasePlayer, OmakasePlayerConfig, PlayerEvent, PlayerEventType, ThumbnailTrack} from '@byomakase/omakase-player';
import {BehaviorSubject, Observable} from 'rxjs';

export abstract class AbstractPlayerService {
  abstract onCreated$: BehaviorSubject<OmakasePlayer | undefined>;
  abstract thumbnailTrackUrl: ReturnType<typeof signal<string | undefined>>;
  abstract thumbnailTrack: ReturnType<typeof signal<ThumbnailTrack | undefined>>;

  abstract create(config?: Partial<OmakasePlayerConfig>): Observable<OmakasePlayer>;
  abstract setThumbnailTrack(url: string | undefined): void;
  abstract destroy(shouldReload?: boolean): void;

  abstract get isReloading(): boolean;
  abstract get omakasePlayer(): OmakasePlayer | undefined;

  protected _isMainMediaAudio: boolean | undefined;

  get isMainMediaAudio(): boolean | undefined {
    return this._isMainMediaAudio;
  }

  protected trackMainMediaAudio(playerEvent: PlayerEvent) {
    if (playerEvent.type === PlayerEventType.PLAYER_MAIN_MEDIA_LOADED) {
      const {mainMediaType, hasVideo} = playerEvent.data.mainMediaState;

      if (mainMediaType === MainMediaType.AUDIO_FILE) {
        this._isMainMediaAudio = true;
      } else {
        this._isMainMediaAudio = hasVideo === undefined ? undefined : !hasVideo;
      }
    } else if (playerEvent.type === PlayerEventType.PLAYER_MAIN_MEDIA_UNLOADED) {
      this._isMainMediaAudio = undefined;
    }
  }
}

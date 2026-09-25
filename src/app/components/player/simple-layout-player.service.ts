/*
 * Copyright 2025 ByOmakase, LLC (https://byomakase.org)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {Injectable, signal} from '@angular/core';
import {OmakasePlayer, OmakasePlayerConfig, PlayerEventType, ThumbnailTrack, TrackSource, TrackType} from '@byomakase/omakase-player';
import {BehaviorSubject, filter, Observable, take} from 'rxjs';
import {AbstractPlayerService} from './player.service.abstract';
@Injectable({
  providedIn: 'root',
})
export class SimpleLayoutPlayerService extends AbstractPlayerService {
  private _omakasePlayer: OmakasePlayer | undefined;

  public onCreated$: BehaviorSubject<OmakasePlayer | undefined> = new BehaviorSubject<OmakasePlayer | undefined>(undefined);
  public thumbnailTrackUrl = signal<string | undefined>(undefined);
  public thumbnailTrack = signal<ThumbnailTrack | undefined>(undefined);

  private _isReloading = false;

  constructor() {
    super();
  }

  /**
   * Creates a new omakase player instance
   *
   * @param {Partial<OmakasePlayerConfig>} config
   */
  create(config?: Partial<OmakasePlayerConfig>) {
    this.destroy();
    this._omakasePlayer = new OmakasePlayer(config);

    this._omakasePlayer.player.onEvent$.subscribe((playerEvent) => {
      // When media is reloaded on the same player instance, loadMainMedia unloads the old thumbnail track.
      // Clear the stale reference here so consumers (e.g. marker list) never resolve a removed track id,
      // which would throw "Wrong track type used for thumbnailTrack". setThumbnailTrack re-populates it after load.
      if (playerEvent.type === PlayerEventType.PLAYER_MAIN_MEDIA_UNLOADING) {
        this.thumbnailTrack.set(undefined);
      }
      this.trackMainMediaAudio(playerEvent);
    });

    this.onCreated$.next(this._omakasePlayer);
    //@ts-ignore
    window.omp = this._omakasePlayer;

    return new Observable<OmakasePlayer>((observer) => {
      observer.next(this._omakasePlayer!);
      observer.complete();
    });
  }

  /**
   * Registers a thumbnail track into Omakase player and stores it in a signal
   *
   * @param {string} url
   * @returns
   */
  setThumbnailTrack(url: string | undefined) {
    if (!this.omakasePlayer) {
      console.error('Player is not instantiated');
      return;
    }

    if (url) {
      this.omakasePlayer.track
        .load(url, {
          trackType: TrackType.THUMBNAIL_TRACK,
        })
        .subscribe((track) => {
          this.thumbnailTrack.set(track as ThumbnailTrack);
          this.omakasePlayer!.chroming.setThumbnailTrack(TrackSource.of(track.id));
          // this.omakasePlayer!.chroming.setThumbnailTrack(url);
        });
    } else {
      this.thumbnailTrack.set(undefined);
    }
    this.thumbnailTrackUrl.set(url);
  }

  /**
   * Tracks if the player has been destroyed with the aim of being recreated
   */
  public get isReloading() {
    return this._isReloading;
  }

  /**
   * Destroys Omakase player instance
   *
   * @param {boolean} shouldReload - Boolean indicating the intent of player recreation
   */
  destroy(shouldReload = false) {
    this._isReloading = shouldReload;
    this.thumbnailTrack.set(undefined);
    this.thumbnailTrackUrl.set(undefined);
    this._isMainMediaAudio = undefined;

    const omakasePlayer = this._omakasePlayer;
    this._omakasePlayer = undefined;
    this.onCreated$.next(undefined);

    if (omakasePlayer) {
      try {
        omakasePlayer.destroy();
      } catch (e) {
        console.error(e);
      }
    }
  }

  /**
   * Omakase player instance
   */
  get omakasePlayer() {
    return this._omakasePlayer;
  }
}

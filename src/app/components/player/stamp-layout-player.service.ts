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

import {inject, Injectable, signal} from '@angular/core';
import {OmakasePlayer, OmakasePlayerConfig} from '@byomakase/omakase-player';
import {BehaviorSubject, Observable, ReplaySubject} from 'rxjs';
import {AbstractPlayerService} from './player.service.abstract';
import {StampLayoutService} from '../layouts/stamp-layout/stamp-layout.service';
import {StringUtil} from '../../common/util/string-util';
@Injectable({
  providedIn: 'root',
})
export class StampLayoutPlayerService extends AbstractPlayerService {
  private _omakasePlayer: OmakasePlayer | undefined;
  private _stampPlayerId: string | undefined;
  private _isMainMediaAudio: boolean | undefined;

  public onCreated$: BehaviorSubject<OmakasePlayer | undefined> = new BehaviorSubject<OmakasePlayer | undefined>(undefined);
  public thumbnailTrackUrl = signal<string | undefined>(undefined);

  private _isReloading = false;

  private stampLayoutService = inject(StampLayoutService);

  constructor() {
    super();
  }

  /**
   * Creates a new omakase player instance
   *
   * @param {Partial<OmakasePlayerConfig>} config
   */

  create(config?: Partial<OmakasePlayerConfig>): Observable<OmakasePlayer> {
    this.destroy();

    const result$ = new ReplaySubject<OmakasePlayer>();

    this.stampLayoutService.createStampPlayer({...config, loadVideoIfPresent: false, isMainPlayer: true}).subscribe((playerId) => {
      this._stampPlayerId = playerId;
      this._omakasePlayer = this.stampLayoutService.getPlayer(playerId);
      this._omakasePlayer!.video.onVideoLoaded$.subscribe((videoLoadedEvent) => {
        if (!videoLoadedEvent) {
          this._isMainMediaAudio = undefined;
          return;
        }
        if (videoLoadedEvent.videoLoadOptions?.protocol === 'audio') {
          this._isMainMediaAudio = true;
        } else {
          this._isMainMediaAudio = false;
        }
      });
      this.onCreated$.next(this._omakasePlayer);

      this._omakasePlayer!.setWatermark('Main Media + Default Audio');

      //TODO remove when support for sidecar text in stamp player is added
      this._omakasePlayer!.subtitles.onShow$.subscribe(() => this._omakasePlayer!.subtitles.hideActiveTrack());

      // @ts-ignore
      window.omp = this._omakasePlayer;
      result$.next(this._omakasePlayer!);
      result$.complete();
    });

    return result$.asObservable();
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
      this.omakasePlayer.setThumbnailVttUrl(url);
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
    if (this._omakasePlayer) {
      try {
        this.stampLayoutService.destroyStampPlayer(this._stampPlayerId!);
      } catch (e) {
        console.error(e);
      }
    }

    this._omakasePlayer = undefined;
    this._stampPlayerId = undefined;
    this.onCreated$.next(this._omakasePlayer);
  }

  /**
   * Omakase player instance
   */
  get omakasePlayer() {
    return this._omakasePlayer;
  }

  get isMainMediaAudio() {
    return this._isMainMediaAudio;
  }
}

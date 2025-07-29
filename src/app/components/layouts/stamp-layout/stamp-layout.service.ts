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

import {computed, inject, Injectable, signal} from '@angular/core';
import {OmakasePlayer, OmakasePlayerConfig, Video, VideoLoadOptions} from '@byomakase/omakase-player';
import {filter, Observable, Subject, take} from 'rxjs';
import {PlayerService} from '../../player/player.service';
import {LayoutService} from '../../layout-menu/layout.service';
import {DefaultChroming, StampChroming} from '@byomakase/omakase-player/dist/player-chroming/model';

export interface StampPlayerConfig extends Partial<OmakasePlayerConfig> {
  loadVideoIfPresent: boolean;
  isMainPlayer: boolean;
}

@Injectable({
  providedIn: 'root',
})

/**
 * The first stamp player is considered "main" in the sense that all video information will be gathered through it for subsequent layout changes. Any components accessing player service
 * will get the instance of the first stamp player. For stamp layout specific player operation this service SHOULD be used
 */
export class StampLayoutService {
  private playersById = signal<Map<string, OmakasePlayer>>(new Map<string, OmakasePlayer>());
  private lastSeekTimeStampByPlayerId = new Map<string, number>();
  public instantiatedPlayerIds = computed(() => [...this.playersById().keys()]);
  public playerConfigByPendingPlayerIds = signal<Map<string, Partial<OmakasePlayerConfig>>>(new Map<string, Partial<OmakasePlayerConfig>>());
  public pendingPlayerIds = computed(() => [...this.playerConfigByPendingPlayerIds().keys()]);
  public onReset$ = new Subject<void>();

  public pendingDestructionPlayerIds = signal<string[]>([]);
  private stampPlayerCreated$ = new Subject<string>();
  private stampPlayerDestroyed$ = new Subject<string>();
  private _isMainPlayerOnPlayAdded = false;
  private _mainPlayerId?: string;

  private _video: Video | undefined = undefined;
  private _videoLoadOptions: VideoLoadOptions | undefined = undefined;

  private playerService = inject(PlayerService);
  private layoutService = inject(LayoutService);

  constructor() {
    //@ts-ignore
    window.sls = this;
  }

  /**
   * Creates a stamp omakase player instance. Only one main player CAN be created and it SHOULD be created first.
   *
   * @param loadVideoIfPresent - Boolean flag that indicates whether the video should be loaded in newly created player
   * @param partialConfig - Partial player configuration that will possibly override default layout player configuration
   * @param isMainPlayer - Boolean flag that indicates whether the video should be treated as main player. Main players main media will be propagated to all other players.
   * @returns
   */
  createStampPlayer(config: StampPlayerConfig): Observable<string> {
    let id: string;
    const result$ = new Subject<string>();

    let finalConfig: StampPlayerConfig = {
      ...this.layoutService.playerConfiguration,
      ...config,
      playerChroming: this.layoutService.playerConfiguration.playerChroming,
    };

    if (config.playerChroming) {
      finalConfig = {
        ...finalConfig,
        playerChroming: {
          ...finalConfig.playerChroming,
          ...config.playerChroming,
          theme: 'STAMP',
        } as StampChroming,
      };
    }

    id = this.requestStampPlayerCreation(finalConfig);

    if (config.isMainPlayer) {
      if (this._mainPlayerId) {
        throw new Error('Main player already created');
      }
      this._mainPlayerId = id;
    }

    this.stampPlayerCreated$
      .pipe(
        filter((createdId) => createdId === id),
        take(1)
      )
      .subscribe(() => {
        const video = this._video;
        const videoLoadOptions = this._videoLoadOptions;
        const player = this.playersById().get(id)!;

        if (config.loadVideoIfPresent && video && videoLoadOptions) {
          player.loadVideo(video.sourceUrl, videoLoadOptions).subscribe(() => {
            const thumbnailTrackUrl = this.playerService.thumbnailTrackUrl();
            if (thumbnailTrackUrl) {
              player.setThumbnailVttUrl(thumbnailTrackUrl);
            }
            result$.next(id);
            result$.complete();
          });
        } else {
          result$.next(id);
          result$.complete();
        }
      });

    return result$;
  }

  /**
   * Destroys Omakase player with provided id.
   *
   * @param id - id of Omakase player to be destroyed
   * @returns
   */
  public destroyStampPlayer(id: string) {
    const player = this.playersById().get(id);

    if (!player) {
      console.error(`Can't delete player with id ${id} because it doesn't exist.`);
      return;
    }

    if (this._mainPlayerId === id) {
      delete this._mainPlayerId;
    }

    player.destroy();
    this.deletePlayerById(id);
    this.requestStampPlayerDestruction(id);
  }

  public getPlayer(id: string) {
    return this.playersById().get(id);
  }

  public getPendingPlayerConfig(id: string) {
    return this.playerConfigByPendingPlayerIds().get(id);
  }

  /**
   * Requests creation of a stamp player in dedicated component.
   *
   * @param config
   * @returns
   */
  private requestStampPlayerCreation(config: Partial<OmakasePlayerConfig>) {
    const id = crypto.randomUUID();
    this.setPlayerConfigByPendingPlayerId(id, {...config, playerHTMLElementId: id});
    return id;
  }

  /**
   * Requests destruction of a stamp player in dedicated component
   * @param id
   */
  private requestStampPlayerDestruction(id: string) {
    this.pendingDestructionPlayerIds.update((prev) => [...prev, id]);
  }

  /**
   * Loads main media from the main player to all other stamp players
   */
  private loadMainMedia() {
    if (this._video && this._mainPlayerId) {
      [...this.playersById().values()]
        .filter((player) => player !== this.playersById().get(this._mainPlayerId!))
        .forEach((player) => {
          player.loadVideo(this._video!.sourceUrl, this._videoLoadOptions);
        });
    }
  }

  /**
   * Notifies the service that the requested player has been successfully created
   *
   * @param id
   * @param player
   */
  public registerStampPlayer(id: string, player: OmakasePlayer) {
    this.setPlayerById(id, player);
    this.deletePlayerConfigByPendingPlayerId(id);

    if (id === this._mainPlayerId) {
      player.video.onVideoLoaded$.subscribe((videoLoadedEvent) => {
        if (videoLoadedEvent) {
          this._video = videoLoadedEvent.video;
          this._videoLoadOptions = videoLoadedEvent.videoLoadOptions;
          this.loadMainMedia();
        }
      });
    }

    this.stampPlayerCreated$.next(id);
  }

  /**
   * Notifies the service that the dedicated component successfully completed player cleanup
   *
   * @param id
   */
  public confirmPlayerDestruction(id: string) {
    this.pendingDestructionPlayerIds.update((prev) => prev.filter((pendingDeletionId) => pendingDeletionId !== id));
  }

  /**
   * Resets the service
   */
  public reset() {
    this.playersById.set(new Map<string, OmakasePlayer>());
    this.playerConfigByPendingPlayerIds.set(new Map<string, Partial<OmakasePlayerConfig>>());
    this.pendingDestructionPlayerIds = signal<string[]>([]);
    this.stampPlayerCreated$ = new Subject<string>();
    this.stampPlayerDestroyed$ = new Subject<string>();
    this._isMainPlayerOnPlayAdded = false;

    this.onReset$.next();

    this._video = undefined;
    this._videoLoadOptions = undefined;
  }

  private setPlayerById(playerId: string, player: OmakasePlayer) {
    const newMap = new Map(this.playersById());
    newMap.set(playerId, player);
    this.playersById.set(newMap);
  }

  private setPlayerConfigByPendingPlayerId(playerId: string, config: Partial<OmakasePlayerConfig>) {
    const newMap = new Map(this.playerConfigByPendingPlayerIds());
    newMap.set(playerId, config);
    this.playerConfigByPendingPlayerIds.set(newMap);
  }

  private deletePlayerConfigByPendingPlayerId(playerId: string) {
    const newMap = new Map(this.playerConfigByPendingPlayerIds());
    newMap.delete(playerId);
    this.playerConfigByPendingPlayerIds.set(newMap);
  }

  private deletePlayerById(playerId: string) {
    const newMap = new Map(this.playersById());
    newMap.delete(playerId);
    this.playersById.set(newMap);
  }
}

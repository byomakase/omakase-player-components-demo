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

import {AfterViewInit, Component, computed, effect, ElementRef, inject, OnDestroy, OnInit, signal, ViewChild} from '@angular/core';
import {PlayerComponent} from '../../player/player.component';
import {PlayerService} from '../../player/player.service';
import {EMPTY, filter, merge, Subject, switchMap, tap} from 'rxjs';
import {VuMeterComponent} from './vu-meter.component';
import {SidecarAudioService} from '../../fly-outs/add-sidecar-audio-fly-out/sidecar-audio-service/sidecar-audio.service';
import {IconDirective} from '../../../common/icon/icon.directive';
import {WindowService} from '../../../common/browser/window.service';
import {
  AudioHandlerApi,
  MainMediaType,
  OmakasePlayer,
  PlayerAudioEventType,
  PlayerAudioType,
  PlayerEventType,
  RouterVisualization,
  RouterVisualizationApi,
  RouterVisualizationTrack,
  SourceUtil,
} from '@byomakase/omakase-player';
import {StringUtil} from '../../../common/util/string-util';

type VuMeterIndexUpdate = 'increment' | 'decrement';
export interface AudioHandlerBundle {
  audioHandler: AudioHandlerApi;
  id: string;
  label: string;
  type: 'main' | 'sidecar';
}

@Component({
  selector: 'app-audio-layout',
  imports: [PlayerComponent, VuMeterComponent, IconDirective],
  host: {'class': 'audio-layout'},
  template: `
    <div class="north-pole">
      <div class="left-side">
        <div class="player-wrapper">
          <app-player></app-player>
        </div>
        <div class="router-container">
          <div id="{{ routerId }}"></div>
        </div>
      </div>
      <div #soundBoard class="sound-board">
        <div class="vu-meters-container">
          @for (audioHandlerBundle of audioHandlerBundles().slice(initialVuMeterIndex(), lastVuMeterIndex() + 1); track audioHandlerBundle.id) {
            <app-vu-meter [isInitial]="$index === 0" [audioHandlerBundle]="audioHandlerBundle" />
          }
        </div>
        @if (!areAllVuMetersDisplayed() && maxVuMeters() > 0) {
          <div [className]="canDecrementVuMeterIndex() ? 'left-arrow-container' : 'left-arrow-container arrow-container-disabled'" (click)="updateInitialVuMeterIndex('decrement')">
            <i appIcon="arrow-left"> </i>
          </div>
          <div [className]="canIncrementVuMeterIndex() ? 'right-arrow-container' : 'right-arrow-container arrow-container-disabled'" (click)="updateInitialVuMeterIndex('increment')">
            <i appIcon="arrow-right"> </i>
          </div>
        }
      </div>
    </div>
  `,
})
export class AudioLayoutComponent implements OnInit, OnDestroy, AfterViewInit {
  public playerService = inject(PlayerService);
  public sidecarAudioService = inject(SidecarAudioService);
  public audioHandlerBundles = signal<AudioHandlerBundle[]>([]);
  private _audioRouterVisualization?: RouterVisualizationApi;
  private _destroyed$ = new Subject<void>();
  private _soundBoardWidth = signal<number | undefined>(undefined);
  private resizeObserver?: ResizeObserver;
  public maxVuMeters = signal<number>(0);
  public routerId = 'omakase-audio-router';
  private windowService = inject(WindowService);

  public areAllVuMetersDisplayed = computed(() => {
    if (this._soundBoardWidth() === undefined) {
      return true;
    }
    return this.maxVuMeters() >= this.audioHandlerBundles().length;
  });

  @ViewChild('soundBoard') private soundBoardElementRef!: ElementRef;

  public initialVuMeterIndex = signal<number>(0);
  public lastVuMeterIndex = computed<number>(() => {
    return Math.max(Math.min(this.initialVuMeterIndex() + this.maxVuMeters() - 1, this.audioHandlerBundles().length - 1), this.initialVuMeterIndex());
  });

  public canIncrementVuMeterIndex = computed(() => this.initialVuMeterIndex() + this.maxVuMeters() < this.audioHandlerBundles().length);
  public canDecrementVuMeterIndex = computed(() => this.initialVuMeterIndex() > 0);

  constructor() {
    effect(() => {
      const soundBoardWidth = this._soundBoardWidth();

      if (soundBoardWidth === undefined) {
        this.maxVuMeters.set(0);
        return;
      }

      const maxVuMeters = Math.max(Math.floor(soundBoardWidth / 150) - 1, 0);
      if (maxVuMeters !== this.maxVuMeters()) {
        this.maxVuMeters.set(maxVuMeters);
        if (maxVuMeters >= this.audioHandlerBundles().length) {
          this.initialVuMeterIndex.set(0);
        } else if (this.lastVuMeterIndex() === this.audioHandlerBundles().length - 1) {
          this.initialVuMeterIndex.set(Math.max(0, this.lastVuMeterIndex() - maxVuMeters));
        }
      }

      if (this.audioHandlerBundles().length && this.lastVuMeterIndex() - this.initialVuMeterIndex() < this.maxVuMeters() - 1) {
        this.initialVuMeterIndex.set(Math.max(0, this.lastVuMeterIndex() - maxVuMeters + 1));
      }
    });
  }

  ngOnDestroy(): void {
    this._destroyed$.next();
    this._destroyed$.complete();
  }

  ngAfterViewInit() {
    this.resizeObserver = new ResizeObserver((entries) => {
      const width = entries[0].contentRect.width;
      this._soundBoardWidth.set(width);
    });
    this.resizeObserver.observe(this.soundBoardElementRef.nativeElement);
  }

  updateInitialVuMeterIndex(type: VuMeterIndexUpdate) {
    if (type === 'increment') {
      if (!this.canIncrementVuMeterIndex()) {
        return;
      }

      this.initialVuMeterIndex.update((prev) => prev + 1);
    } else {
      if (!this.canDecrementVuMeterIndex()) {
        return;
      }
      this.initialVuMeterIndex.update((prev) => prev - 1);
    }
  }

  ngOnInit(): void {
    this.playerService
      .observeMediaLoads(this._destroyed$)
      .pipe(
        switchMap((omakasePlayer) => {
          this._audioRouterVisualization?.destroy();
          delete this._audioRouterVisualization;
          this.audioHandlerBundles.set([]);
          this.initialVuMeterIndex.set(0);

          if (!omakasePlayer) return EMPTY;

          if (this.windowService.userAgent === 'safari' && omakasePlayer.player.mainMedia?.mainMediaType === MainMediaType.HLS) {
            // safari does not support main audio vu meter for HLS
            return omakasePlayer.player.audio.onEvent$.pipe(
              filter(() => !!omakasePlayer.player.mainMedia),
              filter(
                (event) =>
                  event.type === PlayerAudioEventType.PLAYER_AUDIO_TRACK_SWITCHED ||
                  event.type === PlayerAudioEventType.PLAYER_AUDIO_TRACK_LOADED ||
                  event.type === PlayerAudioEventType.PLAYER_AUDIO_TRACK_UNLOADED
              ),
              tap(() => this.setUpSidecarAudioControls(omakasePlayer))
            );
          }

          this.setUpMainAudioControl(omakasePlayer);
          this.setUpSidecarAudioControls(omakasePlayer);

          return merge(
            omakasePlayer.player.onEvent$.pipe(
              filter((event) => event.type === PlayerEventType.PLAYER_MAIN_MEDIA_UNLOADING),
              tap(() => {
                this._audioRouterVisualization?.destroy();
                delete this._audioRouterVisualization;
                this.audioHandlerBundles.set([]);
              })
            ),
            omakasePlayer.player.audio.onEvent$.pipe(
              filter(() => !!omakasePlayer.player.mainMedia),
              filter((event) => event.type === PlayerAudioEventType.PLAYER_AUDIO_TRACK_SWITCHED),
              tap(() => this.setUpMainAudioControl(omakasePlayer))
            ),
            omakasePlayer.player.audio.onEvent$.pipe(
              filter(() => !!omakasePlayer.player.mainMedia),
              filter(
                (event) =>
                  event.type === PlayerAudioEventType.PLAYER_AUDIO_TRACK_SWITCHED ||
                  event.type === PlayerAudioEventType.PLAYER_AUDIO_TRACK_LOADED ||
                  event.type === PlayerAudioEventType.PLAYER_AUDIO_TRACK_UNLOADED
              ),
              tap(() => this.setUpSidecarAudioControls(omakasePlayer))
            )
          );
        })
      )
      .subscribe();
  }

  private setUpMainAudioControl(omakasePlayer: OmakasePlayer): void {
    const activeMainTrack = omakasePlayer.player.audio.state.tracks[PlayerAudioType.MAIN].find((t) => t.active);
    if (!activeMainTrack) {
      return;
    }

    const mainHandler = omakasePlayer.player.audio.getHandler(PlayerAudioType.MAIN);
    if (!mainHandler) {
      return;
    }

    const audioHandlerBundle: AudioHandlerBundle = {
      audioHandler: mainHandler,
      id: 'main',
      type: 'main',
      label: omakasePlayer.track.get(activeMainTrack.trackId)?.label ?? 'main',
    };

    this.initializeAudioRouter();
    mainHandler.createPeakProcessor().subscribe();
    this.audioHandlerBundles.update((prev) => [audioHandlerBundle, ...prev.filter((b) => b.type !== 'main')]);
  }

  private setUpSidecarAudioControls(omakasePlayer: OmakasePlayer): void {
    const activeSidecarTracks = omakasePlayer.player.audio.state.tracks[PlayerAudioType.SIDECAR].filter((t) => t.active);
    const activeSidecarIds = activeSidecarTracks.map((t) => t.trackId);
    const existingSidecarBundleIds = this.audioHandlerBundles()
      .filter((audioHandlerBundle) => audioHandlerBundle.type === 'sidecar')
      .map((audioHandlerBundle) => audioHandlerBundle.id);

    const filteredAudioHandlerBundles = this.audioHandlerBundles().filter((audioHandlerBundle) => audioHandlerBundle.type === 'main' || activeSidecarIds.includes(audioHandlerBundle.id));

    const newAudioHandlerBundles = activeSidecarTracks
      .filter((t) => !existingSidecarBundleIds.includes(t.trackId))
      .map((trackState) => {
        const handler = omakasePlayer.player.audio.getHandler(PlayerAudioType.SIDECAR, trackState.trackId)!;
        const track = omakasePlayer.track.get(trackState.trackId)!;
        return {
          id: trackState.trackId,
          type: 'sidecar',
          audioHandler: handler,
          label: track.label ?? StringUtil.leafUrlToken(SourceUtil.resolveUrlFromSource(track.source!)),
        } as AudioHandlerBundle;
      });

    this.audioHandlerBundles.set([...filteredAudioHandlerBundles, ...newAudioHandlerBundles]);
    this.initializeAudioRouter();
    newAudioHandlerBundles.forEach((audioHandlerBundle) => audioHandlerBundle.audioHandler.createPeakProcessor().subscribe());
  }

  /**
   * Initializes audio router
   */
  public initializeAudioRouter() {
    this._audioRouterVisualization?.destroy();

    const omakasePlayer = this.playerService.omakasePlayer!;
    const outputNumber = omakasePlayer.player.audio.audioContext.destination.maxChannelCount >= 6 ? 6 : 2;

    const sidecarTracks: RouterVisualizationTrack[] = omakasePlayer.player.audio.state.tracks[PlayerAudioType.SIDECAR]
      .filter((t) => t.active && !!omakasePlayer.player.audio.getHandler(PlayerAudioType.SIDECAR, t.trackId))
      .map((trackState) => {
        const track = omakasePlayer.track.get(trackState.trackId)!;
        return {
          trackId: trackState.trackId,
          name: track.label ?? StringUtil.leafUrlToken(SourceUtil.resolveUrlFromSource(track.source!)),
          maxInputNumber: 6,
          inputLabels: ['L', 'R', 'C', 'LFE', 'LS', 'RS'],
        };
      });

    const activeMainTrackState = omakasePlayer.player.audio.state.tracks[PlayerAudioType.MAIN].find((t) => t.active);
    const mainTrack: RouterVisualizationTrack | undefined =
      (this.windowService.userAgent === 'safari' && omakasePlayer.player.mainMedia?.mainMediaType === MainMediaType.HLS) || !activeMainTrackState
        ? undefined
        : {
            maxInputNumber: 6,
            inputLabels: ['L', 'R', 'C', 'LFE', 'LS', 'RS'],
            name: omakasePlayer.track.get(activeMainTrackState.trackId)?.label ?? 'main',
          };

    const visualizationTracks = mainTrack ? [mainTrack, ...sidecarTracks] : sidecarTracks;

    this._audioRouterVisualization = new RouterVisualization(
      {
        size: 'large',
        routerVisualizationHTMLElementId: this.routerId,
        outputNumber,
        outputLabels: ['L', 'R', 'C', 'LFE', 'LS', 'RS'],
        visualizationTracks,
      },
      omakasePlayer
    );
  }
}

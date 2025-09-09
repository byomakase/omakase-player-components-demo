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
import {filter, merge, Observable, Subject, takeUntil} from 'rxjs';
import {AudioPeakProcessorMessageEvent, RouterVisualizationApi} from '@byomakase/omakase-player';
import {VuMeterComponent} from './vu-meter.component';
import {SidecarAudioService} from '../../fly-outs/add-sidecar-audio-fly-out/sidecar-audio-service/sidecar-audio.service';
import {IconDirective} from '../../../common/icon/icon.directive';
import {WindowService} from '../../../common/browser/window.service';

export type PeakProcessor = Observable<Observable<AudioPeakProcessorMessageEvent>>;
type VuMeterIndexUpdate = 'increment' | 'decrement';
export interface PeakProcessorWithMetadata {
  peakProcessor: PeakProcessor;
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
          <div id="omakase-audio-router"></div>
        </div>
      </div>
      <div #soundBoard class="sound-board">
        <div class="vu-meters-container">
          @for (peakProcessor of peakProcessors().slice(initialVuMeterIndex(), lastVuMeterIndex() + 1); track peakProcessor.id) {
          <app-vu-meter [isInitial]="$index === 0" [peakProcessorWithMetadata]="peakProcessor" />
          }
        </div>
        @if(!areAllVuMetersDisplayed() && maxVuMeters() > 0) {
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
  public peakProcessors = signal<PeakProcessorWithMetadata[]>([]);
  private _audioRouterVisualization?: RouterVisualizationApi;
  private _destroyed$ = new Subject<void>();
  private _soundBoardWidth = signal<number | undefined>(undefined);
  private resizeObserver?: ResizeObserver;
  public maxVuMeters = signal<number>(0);
  private windowService = inject(WindowService);

  public areAllVuMetersDisplayed = computed(() => {
    if (this._soundBoardWidth() === undefined) {
      return true;
    }
    return this.maxVuMeters() >= this.peakProcessors().length;
  });

  @ViewChild('soundBoard') private soundBoardElementRef!: ElementRef;

  public initialVuMeterIndex = signal<number>(0);
  public lastVuMeterIndex = computed<number>(() => {
    return Math.max(Math.min(this.initialVuMeterIndex() + this.maxVuMeters() - 1, this.peakProcessors().length - 1), this.initialVuMeterIndex());
  });

  public canIncrementVuMeterIndex = computed(() => this.initialVuMeterIndex() + this.maxVuMeters() < this.peakProcessors().length);
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
        if (maxVuMeters >= this.peakProcessors().length) {
          this.initialVuMeterIndex.set(0);
        } else if (this.lastVuMeterIndex() === this.peakProcessors().length - 1) {
          this.initialVuMeterIndex.set(Math.max(0, this.lastVuMeterIndex() - maxVuMeters));
        }
      }

      if (this.peakProcessors().length && this.lastVuMeterIndex() - this.initialVuMeterIndex() < this.maxVuMeters() - 1) {
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
    this.playerService.onCreated$.pipe(takeUntil(this._destroyed$)).subscribe((player) => {
      if (!player) {
        delete this._audioRouterVisualization;
        this.peakProcessors.set([]);
        this.initialVuMeterIndex.set(0);
        return;
      }

      if (this.windowService.userAgent !== 'safari') {
        // safari does not support main audio vu meter
        merge(player.audio.onAudioLoaded$, player.audio.onAudioSwitched$)
          .pipe(
            takeUntil(this._destroyed$),
            filter((event) => !!event?.activeAudioTrack)
          )
          .subscribe((audioEvent) => {
            if (audioEvent?.activeAudioTrack) {
              const peakProcessor: PeakProcessorWithMetadata = {
                peakProcessor: player.audio.createMainAudioPeakProcessor(),
                id: audioEvent.activeAudioTrack.id ?? 'main',
                type: 'main',
                label: audioEvent.activeAudioTrack.label,
              };

              this.peakProcessors.update((prev) => [peakProcessor, ...prev.filter((pp) => pp.type !== 'main')]);

              if (!this._audioRouterVisualization) {
                this.initializeAudioRouter();
              } else {
                this._audioRouterVisualization.updateMainTrack({
                  name: audioEvent.activeAudioTrack.label,
                });
              }
            }
          });
      }

      merge(player.audio.onSidecarAudioChange$, player.audio.onSidecarAudioRemove$, player.audio.onSidecarAudioLoaded$)
        .pipe(takeUntil(this._destroyed$))
        .subscribe(() => {
          const activeSidecarIds = player.audio.getActiveSidecarAudioTracks().map((track) => track.id);
          const activeSidecarPeakProcessorsIds = this.peakProcessors()
            .filter((pp) => pp.type === 'sidecar')
            .map((pp) => pp.id);
          const filteredPeakProcessors = this.peakProcessors().filter((pp) => pp.type === 'main' || activeSidecarIds.includes(pp.id));
          const newPeakProcessors = activeSidecarIds
            .filter((id) => !activeSidecarPeakProcessorsIds.includes(id))
            .map((id) => {
              return {
                id: id,
                type: 'sidecar',
                peakProcessor: player.audio.createSidecarAudioPeakProcessor(id),
                label: player.audio.getSidecarAudio(id)!.audioTrack.label,
              } as PeakProcessorWithMetadata;
            });

          this.peakProcessors.set([...filteredPeakProcessors, ...newPeakProcessors]);
          this.initializeAudioRouter();
        });
    });
  }

  /**
   * Initializes audio router
   */
  public initializeAudioRouter() {
    const outputNumber = this.playerService.omakasePlayer!.audio.getAudioContext().destination.maxChannelCount >= 6 ? 6 : 2;
    const sidecarTracks = this.playerService.omakasePlayer!.audio.getActiveSidecarAudioTracks().map((track) => {
      return {
        trackId: track.id,
        name: track.label,
        maxInputNumber: 6,
        inputLabels: ['L', 'R', 'C', 'LFE', 'LS', 'RS'],
      };
    });

    const mainTrack =
      this.windowService.userAgent === 'safari'
        ? undefined
        : {
            name: this.playerService.omakasePlayer!.audio.getActiveAudioTrack()?.label ?? 'main',
            maxInputNumber: 6,
            inputLabels: ['L', 'R', 'C', 'LFE', 'LS', 'RS'],
          };

    this._audioRouterVisualization = this.playerService.omakasePlayer!.initializeRouterVisualization({
      size: 'large',
      outputNumber,
      routerVisualizationHTMLElementId: 'omakase-audio-router',
      outputLabels: ['L', 'R', 'C', 'LFE', 'LS', 'RS'],
      mainTrack: mainTrack,
      sidecarTracks: sidecarTracks,
    });
  }
}

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

import {AfterViewInit, Component, computed, CUSTOM_ELEMENTS_SCHEMA, effect, ElementRef, HostListener, inject, OnDestroy, signal, ViewChild} from '@angular/core';
import {PlayerComponent} from '../../player/player.component';
import {MarkerTrack, MarkerTrackService} from '../../fly-outs/add-markers-fly-out/marker-track.service';
import {IconDirective} from '../../../common/icon/icon.directive';
import {LoadedSidecarText, SidecarTextService} from '../../fly-outs/add-sidecar-text-fly-out/text-sidecar.service';
import {
  BarChartLane,
  ImageButton,
  LineChartLane,
  MarkerApi,
  MarkerLane,
  MarkerTrackApi,
  MomentMarker,
  MomentObservation,
  OgChartLane,
  OmakaseTextTrack,
  OmpAudioTrack,
  PeriodMarker,
  PeriodObservation,
  SubtitlesLane,
  SubtitlesVttTrack,
  ThumbnailLane,
  TimelineApi,
  TimelineLaneApi,
} from '@byomakase/omakase-player';
import {PlayerService} from '../../player/player.service';
import {combineLatest, filter, skip, Subject, take, takeUntil} from 'rxjs';
import {Constants} from '../../../constants/constants';
import {StringUtil} from '../../../common/util/string-util';
import {TextTrackGroupingLane} from '../../../common/timeline/grouping-lane/text-grouping-lane/text-track-grouping-lane';
import {MarkerListComponent} from '../../../common/marker-list/marker-list.component';
import {CueUtil} from '../../../common/util/cue-util';
import {ColorService} from '../../../common/services/color.service';
import {MarkerShortcutUtil} from '../../../common/util/marker-shortcut-util';
import {ObservationTrack, ObservationTrackService} from '../../fly-outs/add-observation-track-fly-out/observation-track.service';
import {ColorUtil} from '../../../common/util/color-util';
import {ObservationTrackGroupingLane, ObservationTrackGroupingLaneConfig} from '../../../common/timeline/grouping-lane/observation-grouping-lane/observation-track-grouping-lane';
import {toObservable} from '@angular/core/rxjs-interop';
import {SidecarAudioService} from '../../fly-outs/add-sidecar-audio-fly-out/sidecar-audio-service/sidecar-audio.service';
import {SidecarAudioSelectComponent} from '../../../common/controls/audio-select/audio-select.component';
import {SidecarTextSelectComponent} from '../../../common/controls/text-select/text-select.component';
import {MarkerTrackSelectComponent} from '../../../common/controls/marker-track-select/marker-track-select.component';
import {FormControl, ReactiveFormsModule} from '@angular/forms';

type PlayControlState = 'play' | 'pause' | 'replay';
type MuteControlState = 'mute' | 'unmute';
type TextVisibilityControlState = 'show' | 'hide';
type PlaybackRate = 1 | 2 | 4 | 8 | 0.5 | 0.25 | 0.75;
type PlaybackControlGroupingGridArea = `"a b c" "d d d"` | `"a b" "d d"`;
type GroupingColumnTemplate = '1fr 1fr' | '1fr';
type FlexDirection = 'row' | 'column';

@Component({
  selector: 'app-editorial-layout',
  imports: [PlayerComponent, MarkerListComponent, IconDirective, SidecarAudioSelectComponent, SidecarTextSelectComponent, MarkerTrackSelectComponent, ReactiveFormsModule],
  host: {'class': 'editorial-layout'},
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="content">
      <div #leftSide class="left-side">
        <div #playerWrapper class="player-wrapper">
          <app-player></app-player>
        </div>
        <div class="south-pole">
          <div #upperControlPanel class="upper-control-panel">
            @if (numberOfColumns()) {
            <div class="playback-volume-control-grouping" [style.grid-template-areas]="playbackControlGroupingGrid()">
              <div class="play-pause-replay">
                <button [disabled]="playControlDisabled()" (click)="handlePlayControlButtonClick()">
                  @if (playControlState() === 'play') { Play } @else if (playControlState() === 'pause') { Pause } @else { Replay }
                </button>
              </div>
              <div class="playback-speed">
                <select [disabled]="playbackRateDisabled()" [formControl]="playbackRateFormControl">
                  @for(playbackRate of playbackRates; track playbackRate) {
                  <option [value]="playbackRate">{{ playbackRate }}x</option>
                  }
                </select>
              </div>
              @if (numberOfColumns() > 1){
              <div class="mute">
                <button [disabled]="muteControlDisabled()" (click)="handleMuteControlClick()">@if(muteControlState() === 'mute'){Mute} @else {Unmute}</button>
              </div>
              }
              <div class="volume-slider-container">
                Volume
                <input [disabled]="volumeDisabled()" [formControl]="volumeFormControl" class="volume-range" type="range" step="0.01" min="0" max="1" />
              </div>
            </div>
            } @if (numberOfColumns() > 2) {
            <div class="control-grouping" [style.grid-template-columns]="groupingColumnTemplate()">
              <div><button [disabled]="stepOneFrameForwardsDisabled()" (click)="handleStepOneFrameForwardsClick()">Step Forward</button></div>
              @if (numberOfColumns() === 4) {
              <div><button [disabled]="fullScreenDisabled()" (click)="handleFullscreenClick()">Full Screen</button></div>
              }
              <div><button [disabled]="stepOneFrameBackwardsDisabled()" (click)="handleStepOneFrameBackwardsClick()">Step Backward</button></div>
              @if (numberOfColumns() === 4) {
              <div><button [disabled]="textVisibilityControlDisabled()" (click)="handleTextVisibilityClick()">@if(textVisibilityControlState() === 'hide'){Hide Text} @else {Show Text}</button></div>
              }
            </div>
            }
          </div>
          @if (isSidecarSelectPresent()) {
          <div class="lower-control-panel" [style.flex-direction]="selectContainerFlexDirection()">
            @if (isAudioSelectEnabled()) {
            <div class="selector-wrapper">
              <span> Audio </span>
              <app-audio-select />
            </div>
            } @if (isTextSelectEnabled()) {
            <div class="selector-wrapper">
              <span> Text </span>
              <app-text-select />
            </div>
            } @if (isMarkerTrackSelectEnabled()) {
            <div class="selector-wrapper">
              <span> Marker </span>
              <app-marker-track-select />
            </div>
            }
          </div>
          }
        </div>
      </div>
      <div #rightSide class="right-side">
        @if (renderedMarkerTrack()) {
        <app-marker-list [source]="renderedMarkerTrack()" [readOnly]="markerTrackService.activeMarkerTrack()?.readOnly ?? true" />

        } @else {
        <div class="info-message">No marker tracks have been loaded. Click <i appIcon="pin"> </i>to load a marker track.</div>

        }
      </div>
    </div>
  `,
})
export class EditorialLayoutComponent implements AfterViewInit, OnDestroy {
  public markerTrackService = inject(MarkerTrackService);
  public sidecarAudioService = inject(SidecarAudioService);
  public sidecarTextService = inject(SidecarTextService);
  public playerService = inject(PlayerService);
  public observationTrackService = inject(ObservationTrackService);

  public playbackControlGroupingGrid = signal<PlaybackControlGroupingGridArea>('"a b c" "d d d"');
  public groupingColumnTemplate = signal<GroupingColumnTemplate>('1fr 1fr');

  public stepOneFrameForwardsDisabled = signal<boolean>(true);
  public stepOneFrameBackwardsDisabled = signal<boolean>(true);

  public playControlState = signal<PlayControlState>('play');
  public playControlDisabled = signal<boolean>(true);

  public muteControlState = signal<MuteControlState>('mute');
  public muteControlDisabled = signal<boolean>(true);

  public fullScreenDisabled = signal<boolean>(true);

  public textVisibilityControlState = signal<TextVisibilityControlState>('hide');
  public textVisibilityControlDisabled = computed(() => {
    return this.embeddedTextTracks().length + this.sidecarTextService.loadedSidecarTexts().length === 0;
  });

  public playbackRateFormControl = new FormControl<PlaybackRate>(1);
  public playbackRates: PlaybackRate[] = [0.25, 0.5, 0.75, 1, 2, 4, 8];
  public playbackRateDisabled = signal<boolean>(true);

  public volumeFormControl = new FormControl<number>(1);
  public volumeDisabled = signal<boolean>(true);

  public isAudioSelectEnabled = computed(() => {
    return this.embeddedAudioTracks().length + this.sidecarAudioService.loadedSidecarAudios().length > 1;
  });
  public isTextSelectEnabled = computed(() => {
    return this.embeddedTextTracks().length + this.sidecarTextService.loadedSidecarTexts().length > 1;
  });
  public isMarkerTrackSelectEnabled = computed(() => {
    return this.markerTrackService.markerTracks().length > 1;
  });

  public isSidecarSelectPresent = computed(() => {
    return this.isAudioSelectEnabled() || this.isTextSelectEnabled() || this.isMarkerTrackSelectEnabled();
  });

  private embeddedTextTracks = signal<OmakaseTextTrack[]>([]);
  private embeddedAudioTracks = signal<OmpAudioTrack[]>([]);

  private _destroyed$ = new Subject<void>();

  public activeMarkerLane = signal<MarkerLane | undefined>(undefined);

  @ViewChild('leftSide') leftSideRef!: ElementRef;
  @ViewChild('rightSide') rightSideRef!: ElementRef;
  @ViewChild('upperControlPanel') upperControlPanelRef!: ElementRef<HTMLDivElement>;

  private resizeObserver?: ResizeObserver;
  private panelResizeObserver?: ResizeObserver;

  public renderedMarkerTrack = signal<MarkerTrackApi | undefined>(undefined);
  private destroyed$ = new Subject<void>();

  // replay subject with replay value of 1, first value should be skipped
  // inspected in angular source code, possibly subjected to change
  private markerTrack$ = toObservable<MarkerTrack | undefined>(this.markerTrackService.activeMarkerTrack);

  private colorService = inject(ColorService);

  private appendedHelpMenuGroup = false;

  public numberOfColumns = signal(3);
  public selectContainerFlexDirection = signal<FlexDirection>('row');

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  constructor() {
    this.markerTrack$.subscribe((markerTrack) => {
      if (!markerTrack) {
        this.renderedMarkerTrack()?.destroy();
        this.renderedMarkerTrack.set(undefined);
        return;
      }

      if (this.playerService.omakasePlayer) {
        this.createMarkerTrack();
      }
    });

    this.playerService.onCreated$
      .pipe(
        filter((p) => !!p),
        // take(1),
        takeUntil(this.destroyed$)
        // takeUntil(this.markerTrack$.pipe(skip(1)))
      )
      .subscribe((player) => {
        player.video.onVideoLoaded$.pipe(takeUntil(this.destroyed$)).subscribe((videoLoadedEvent) => {
          if (!videoLoadedEvent) {
            // disable all of the controls
            this.stepOneFrameBackwardsDisabled.set(true);
            this.stepOneFrameForwardsDisabled.set(true);
            this.playControlDisabled.set(true);
            this.playControlState.set('play');
            this.muteControlDisabled.set(true);
            this.muteControlState.set('mute');
            this.fullScreenDisabled.set(true);
            this.playbackRateDisabled.set(true);

            return;
          }

          // enable controls

          this.stepOneFrameForwardsDisabled.set(false);
          this.playControlDisabled.set(false);
          this.muteControlDisabled.set(false);
          this.fullScreenDisabled.set(false);
          this.playbackRateDisabled.set(false);

          // track time change event
          player.video.onVideoTimeChange$.pipe(takeUntil(this.destroyed$)).subscribe((videoTimeChangeEvent) => {
            if (videoTimeChangeEvent.frame === 0) {
              this.stepOneFrameBackwardsDisabled.set(true);
            } else {
              this.stepOneFrameBackwardsDisabled.set(false);
            }
          });

          // track play control state
          player.video.onPlay$.pipe(takeUntil(this.destroyed$)).subscribe(() => {
            this.playControlState.set('pause');
          });
          player.video.onPause$.pipe(takeUntil(this.destroyed$)).subscribe(() => {
            this.playControlState.set('play');
          });
          player.video.onEnded$.pipe(takeUntil(this.destroyed$)).subscribe(() => {
            this.playControlState.set('replay');
            this.stepOneFrameForwardsDisabled.set(true);

            // if seek happens change to play state
            player.video.onVideoTimeChange$.pipe(take(1), takeUntil(this.destroyed$)).subscribe(() => {
              this.playControlState.set('play');
              this.stepOneFrameForwardsDisabled.set(false);
            });
          });

          //track mute state and volume
          player.audio.onAudioOutputVolumeChange$.subscribe((outputVolumeChangeEvent) => {
            if (outputVolumeChangeEvent.muted) {
              this.muteControlState.set('unmute');
            } else {
              this.muteControlState.set('mute');
            }
            this.volumeFormControl.setValue(outputVolumeChangeEvent.volume, {emitEvent: false});
          });

          // track subtitles visibility state
          player.subtitles.onShow$.subscribe(() => this.textVisibilityControlState.set('hide'));
          player.subtitles.onHide$.subscribe(() => this.textVisibilityControlState.set('show'));

          // sync playback rate changes
          this.playbackRateFormControl.valueChanges.subscribe((playbackRate) => {
            if (playbackRate) {
              player.video.setPlaybackRate(playbackRate);
            }
          });

          player.video.onPlaybackRateChange$.subscribe((videoPlaybackRateEvent) => {
            this.playbackRateFormControl.setValue(videoPlaybackRateEvent.playbackRate as PlaybackRate, {emitEvent: false});
          });

          //sync volume changes
          this.volumeFormControl.valueChanges.subscribe((volume) => {
            if (volume === null) {
              return;
            }
            this.playerService.omakasePlayer!.audio.setAudioOutputVolume(volume);
          });

          if (!this.appendedHelpMenuGroup) {
            player.video.appendHelpMenuGroup(MarkerShortcutUtil.getKeyboardShortcutsHelpMenuGroup('unknown'));
            this.appendedHelpMenuGroup = true;
          }
          this.createMarkerTrack();

          player.subtitles.onSubtitlesLoaded$.subscribe((subtitlesLoadedEvent) => {
            if (subtitlesLoadedEvent) {
              this.embeddedTextTracks.set(subtitlesLoadedEvent.tracks);
            } else {
              this.embeddedTextTracks.set([]);
            }
          });

          player.audio.onAudioLoaded$.subscribe((audioLoadedEvent) => {
            if (audioLoadedEvent) {
              this.embeddedAudioTracks.set(audioLoadedEvent.audioTracks);
            } else {
              this.embeddedAudioTracks.set([]);
            }
          });
        });
      });
  }

  ngAfterViewInit(): void {
    // // make marker list the same size as player wrapper
    // this.resizeObserver = new ResizeObserver(() => {
    //   const height = this.leftSideRef.nativeElement.offsetHeight;

    //   this.rightSideRef.nativeElement.style.height = `${height}px`;
    // });

    // this.resizeObserver.observe(this.leftSideRef.nativeElement);

    this.panelResizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        this.onUpperPanelResize(width);
      }
    });
    this.panelResizeObserver.observe(this.upperControlPanelRef.nativeElement);
  }
  onUpperPanelResize(width: number) {
    if (width < 350) {
      this.numberOfColumns.set(1);
    } else if (width < 500) {
      this.numberOfColumns.set(2);
    } else if (width < 620) {
      this.numberOfColumns.set(3);
    } else {
      this.numberOfColumns.set(4);
    }

    if (width < 600) {
      this.selectContainerFlexDirection.set('column');
    } else {
      this.selectContainerFlexDirection.set('row');
    }

    this.resolvePlaybackControlGroupingGrid();
    this.resolveControlGroupingColumns();
  }

  resolvePlaybackControlGroupingGrid() {
    if (this.numberOfColumns() > 1) {
      this.playbackControlGroupingGrid.set(`"a b c" "d d d"`);
    } else {
      this.playbackControlGroupingGrid.set(`"a b" "d d"`);
    }
  }

  resolveControlGroupingColumns() {
    if (this.numberOfColumns() === 4) {
      this.groupingColumnTemplate.set('1fr 1fr');
    } else {
      this.groupingColumnTemplate.set('1fr');
    }
  }

  private createMarkerTrack() {
    const player = this.playerService.omakasePlayer;
    const markerTrack = this.markerTrackService.activeMarkerTrack();
    if (!player) {
      console.warn("player is undefined, can't create marker list");
      return;
    }

    if (!markerTrack) {
      return;
    }

    this.renderedMarkerTrack()?.destroy();

    const colorResolver = this.colorService.createColorResolver(crypto.randomUUID(), this.markerTrackService.HEX_COLORS);

    player
      .createMarkerTrack({
        vttUrl: markerTrack.src,
        vttMarkerCreateFn: (cue, index) => {
          const name = CueUtil.extractName(cue.text);
          const color = markerTrack.color !== 'multicolor' ? markerTrack.color : colorResolver.getColor(true);

          if (cue.endTime - cue.startTime < 1) {
            return new MomentMarker({
              timeObservation: {
                time: cue.startTime,
              },
              style: {
                color: color,
              },
              editable: !markerTrack.readOnly,
              text: name === '' ? `Marker ${index + 1}` : name,
            });
          } else {
            return new PeriodMarker({
              timeObservation: {
                start: cue.startTime,
                end: cue.endTime,
              },
              style: {
                color: color,
              },
              editable: !markerTrack.readOnly,
              text: name === '' ? `Marker ${index + 1}` : name,
            });
          }
        },
      })
      .subscribe((markerTrack) => {
        this.renderedMarkerTrack.set(markerTrack);

        markerTrack.onMarkerSelected$.subscribe((markerSelectedEvent) => {
          if (markerSelectedEvent.marker) {
            this.seekToMarker(markerSelectedEvent.marker);
          }
        });
      });
  }

  seekToMarker(marker: MarkerApi) {
    const timeObservation = marker.timeObservation;
    let start;

    if ('start' in timeObservation) {
      start = (timeObservation as PeriodObservation).start!;
    } else {
      start = (timeObservation as MomentObservation).time;
    }

    return this.playerService.omakasePlayer!.video.pause().subscribe(() => this.playerService.omakasePlayer!.video.seekToTime(start));
  }

  public handlePlayControlButtonClick() {
    if (this.playControlDisabled()) {
      return;
    }
    switch (this.playControlState()) {
      case 'play':
        this.playerService.omakasePlayer!.video!.play();
        break;
      case 'pause':
        this.playerService.omakasePlayer!.video!.pause();
        break;
      case 'replay':
        this.playerService.omakasePlayer!.video!.seekToFrame(0).subscribe(() => {
          this.playerService.omakasePlayer!.video!.play();
        });
    }
  }

  public handleMuteControlClick() {
    if (this.muteControlDisabled()) {
      return;
    }

    if (this.muteControlState() === 'mute') {
      this.playerService.omakasePlayer!.audio.muteAudioOutput();
    } else {
      this.playerService.omakasePlayer!.audio.unmuteAudioOutput();
    }
  }

  public handleStepOneFrameForwardsClick() {
    if (this.stepOneFrameForwardsDisabled()) {
      return;
    }

    this.playerService.omakasePlayer!.video!.pause().subscribe(() => {
      this.playerService.omakasePlayer!.video.seekFromCurrentFrame(1);
    });
  }

  public handleStepOneFrameBackwardsClick() {
    if (this.stepOneFrameBackwardsDisabled()) {
      return;
    }

    this.playerService.omakasePlayer!.video!.pause().subscribe(() => {
      this.playerService.omakasePlayer!.video.seekFromCurrentFrame(-1);
    });
  }

  public handleTextVisibilityClick() {
    if (this.textVisibilityControlDisabled()) {
      return;
    }

    if (this.textVisibilityControlState() === 'show') {
      this.playerService.omakasePlayer!.subtitles.showActiveTrack();
    } else {
      this.playerService.omakasePlayer!.subtitles.hideActiveTrack();
    }
  }

  public handleFullscreenClick() {
    if (this.fullScreenDisabled()) {
      return;
    }

    this.playerService.omakasePlayer!.video.toggleFullscreen();
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeypress(event: KeyboardEvent) {
    if (this.playerService.omakasePlayer) {
      const isHandled = MarkerShortcutUtil.handleKeyboardEvent(event, this.playerService.omakasePlayer, this.renderedMarkerTrack());
      if (isHandled) {
        event.preventDefault();
      }
    }
  }
}

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

import {AfterViewInit, Component, computed, CUSTOM_ELEMENTS_SCHEMA, ElementRef, HostListener, inject, OnDestroy, signal, ViewChild, ChangeDetectionStrategy} from '@angular/core';
import {PlayerComponent} from '../../player/player.component';
import {MarkerTrackService, SidecarMarkerTrack} from '../../fly-outs/add-markers-fly-out/marker-track.service';
import {IconDirective} from '../../../common/icon/icon.directive';
import {PlayerService} from '../../player/player.service';
import {combineLatest, EMPTY, filter, merge, of, Subject, switchMap, takeUntil, tap} from 'rxjs';
import {toObservable} from '@angular/core/rxjs-interop';
import {MarkerShortcutUtil} from '../../../common/util/marker-shortcut-util';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {
  AudioHandlerEventType,
  ChromingMarkerBarEventType,
  ChromingMarkerBarHandlerApi,
  ChromingTrackDestination,
  HelpMenuGroupInsertPosition,
  MarkerListEvent,
  MarkerListEventType,
  MarkerOnChromingStyle,
  MarkerOnMarkerListStyle,
  MarkerTrack,
  MediaTemporalFormat,
  PlayerAudioEventType,
  PlayerAudioType,
  PlayerEventType,
  PlayerTextEventType,
  TimedItemTemporalUtil,
  TrackSource,
  TrackType,
  UiEventType,
} from '@byomakase/omakase-player';
import {MarkerListComponent} from '../../../common/marker-list/marker-list.component';
import {MarkerTrackSelectComponent} from '../../../common/controls/marker-track-select/marker-track-select.component';
import {SidecarAudioSelectComponent} from '../../../common/controls/audio-select/audio-select.component';
import {SidecarTextSelectComponent} from '../../../common/controls/text-select/text-select.component';

type PlayControlState = 'play' | 'pause' | 'replay';
type MuteControlState = 'mute' | 'unmute';
type TextVisibilityControlState = 'show' | 'hide';
type PlaybackRate = 1 | 2 | 4 | 8 | 0.5 | 0.25 | 0.75;
type PlaybackControlGroupingGridArea = `"a b c" "d d d"` | `"a b" "d d"`;
type GroupingColumnTemplate = '1fr 1fr' | '1fr';
type FlexDirection = 'row' | 'column';

@Component({
  selector: 'app-hybrid-layout',
  imports: [PlayerComponent, MarkerListComponent, IconDirective, MarkerTrackSelectComponent, SidecarAudioSelectComponent, SidecarTextSelectComponent, ReactiveFormsModule],
  host: {'class': 'hybrid-layout'},
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="north-pole">
      <div #leftSide class="left-side">
        <div #playerWrapper class="player-wrapper">
          <app-player></app-player>
        </div>
      </div>
      <div #rightSide class="right-side">
        @if (renderedMarkerTrack()) {
          <app-marker-list [source]="markerTrackService.activeMarkerTrack()" [readOnly]="markerTrackService.activeMarkerTrack()?.readOnly ?? true" (markerListEvent)="onMarkerListEvent($event)" />
        } @else {
          <div class="info-message">No marker tracks have been loaded. Click <i appIcon="pin"> </i>to load a marker track.</div>
        }
      </div>
    </div>
    <div class="south-pole">
      <div #upperControlPanel class="upper-control-panel">
        @if (numberOfColumns()) {
          <div class="playback-volume-control-grouping" [style.grid-template-areas]="playbackControlGroupingGrid()">
            <div class="play-pause-replay">
              <button [disabled]="playControlDisabled()" (click)="handlePlayControlButtonClick()">
                @if (playControlState() === 'play') {
                  Play
                } @else if (playControlState() === 'pause') {
                  Pause
                } @else {
                  Replay
                }
              </button>
            </div>
            <div class="playback-speed">
              <select [formControl]="playbackRateFormControl">
                @for (playbackRate of playbackRates; track playbackRate) {
                  <option [value]="playbackRate">{{ playbackRate }}x</option>
                }
              </select>
            </div>
            @if (numberOfColumns() > 1) {
              <div class="mute">
                <button [disabled]="muteControlDisabled()" (click)="handleMuteControlClick()">
                  @if (muteControlState() === 'mute') {
                    Mute
                  } @else {
                    Unmute
                  }
                </button>
              </div>
            }
            <div class="volume-slider-container">
              Volume
              <input [formControl]="volumeFormControl" class="volume-range" type="range" step="0.01" min="0" max="1" [style.--fill.%]="(volumeFormControl.value ?? 0) * 100" />
            </div>
          </div>
        }
        @if (numberOfColumns() > 2) {
          <div class="control-grouping" [style.grid-template-columns]="groupingColumnTemplate()">
            <div><button [disabled]="stepOneFrameForwardsDisabled()" (click)="stepNFrames(1)">Step Forward</button></div>
            @if (numberOfColumns() === 4) {
              <div><button [disabled]="fullScreenDisabled()" (click)="handleFullscreenClick()">Full Screen</button></div>
            }
            <div><button [disabled]="stepOneFrameBackwardsDisabled()" (click)="stepNFrames(-1)">Step Backward</button></div>
            @if (numberOfColumns() === 4) {
              <div>
                <button [disabled]="textVisibilityControlDisabled()" (click)="handleTextVisibilityClick()">
                  @if (textVisibilityControlState() === 'show') {
                    Hide Text
                  } @else {
                    Show Text
                  }
                </button>
              </div>
            }
          </div>
        }
      </div>
      <div class="lower-control-panel" [style.flex-direction]="selectContainerFlexDirection()">
        @if (audioSelectVisible()) {
          <div class="selector-wrapper">
            <span> Audio </span>
            <app-audio-select />
          </div>
        }
        @if (textSelectVisible()) {
          <div class="selector-wrapper">
            <span> Text </span>
            <app-text-select />
          </div>
        }
        @if (isMarkerTrackSelectEnabled()) {
          <div class="selector-wrapper">
            <span> Marker </span>
            <app-marker-track-select />
          </div>
        }
      </div>
    </div>
  `,
})
export class HybridLayoutComponent implements AfterViewInit, OnDestroy {
  public markerTrackService = inject(MarkerTrackService);
  private playerService = inject(PlayerService);

  // playback controls
  public playControlState = signal<PlayControlState>('play');
  public playControlDisabled = signal<boolean>(true);

  public stepOneFrameForwardsDisabled = signal<boolean>(true);
  public stepOneFrameBackwardsDisabled = signal<boolean>(true);

  public muteControlState = signal<MuteControlState>('mute');
  public muteControlDisabled = signal<boolean>(true);

  public fullScreenDisabled = signal<boolean>(true);

  public textVisibilityControlState = signal<TextVisibilityControlState>('hide');
  public textVisibilityControlDisabled = signal<boolean>(true);

  public playbackRateFormControl = new FormControl<PlaybackRate>({value: 1, disabled: true});
  public playbackRates: PlaybackRate[] = [0.25, 0.5, 0.75, 1, 2, 4, 8];

  public volumeFormControl = new FormControl<number>(1);

  public audioSelectVisible = signal(false);
  public textSelectVisible = signal(false);
  public isMarkerTrackSelectEnabled = computed(() => this.markerTrackService.markerTracks().length > 1);

  public numberOfColumns = signal(3);
  public selectContainerFlexDirection = signal<FlexDirection>('row');
  public playbackControlGroupingGrid = signal<PlaybackControlGroupingGridArea>('"a b c" "d d d"');
  public groupingColumnTemplate = signal<GroupingColumnTemplate>('1fr 1fr');

  public renderedMarkerTrackChromingHandler = signal<ChromingMarkerBarHandlerApi | undefined>(undefined);
  public renderedMarkerTrack = computed(() => {
    const chromingHandler = this.renderedMarkerTrackChromingHandler();
    if (chromingHandler) {
      const markerTrackId = chromingHandler.getTrackIds().at(0)!;
      return this.playerService.omakasePlayer!.track.get(markerTrackId)! as MarkerTrack;
    }
    return undefined;
  });

  @ViewChild('leftSide') leftSideRef!: ElementRef<HTMLDivElement>;
  @ViewChild('rightSide') rightSideRef!: ElementRef<HTMLDivElement>;
  @ViewChild('upperControlPanel') upperControlPanelRef!: ElementRef<HTMLDivElement>;

  private resizeObserver?: ResizeObserver;
  private panelResizeObserver?: ResizeObserver;

  // appended once per player instance; reset when the player is destroyed so it re-appends on the next one
  private appendedMarkerHelpMenuGroup = false;

  private destroyed$ = new Subject<void>();

  // replay subject with replay value of 1, first value should be skipped
  // inspected in angular source code, possibly subjected to change
  private markerTrack$ = toObservable<SidecarMarkerTrack | undefined>(this.markerTrackService.activeMarkerTrack);

  private _playerEventTypesOfInterest = new Set([
    PlayerEventType.PLAYER_PLAY,
    PlayerEventType.PLAYER_PAUSE,
    PlayerEventType.PLAYER_ENDED,
    PlayerEventType.PLAYER_PLAYBACK_PROGRESS,
    PlayerEventType.PLAYER_PLAYBACK_RATE_UPDATE,
    PlayerEventType.PLAYER_MAIN_MEDIA_UNLOADING,
  ]);

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.panelResizeObserver?.disconnect();
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  constructor() {
    this.volumeFormControl.disable();

    // playback control wiring - rebinds on every main media (re)load, tears down on destroy/unload
    this.playerService
      .observeMediaLoads(this.destroyed$)
      .pipe(
        switchMap((omakasePlayer) => {
          if (!omakasePlayer) {
            this.disableControls();
            return EMPTY;
          }
          this.enableControls();
          this.resolveAudioSelectVisibility();
          this.resolveTextControls();

          return merge(
            omakasePlayer.player.onEvent$.pipe(
              filter((event) => this._playerEventTypesOfInterest.has(event.type)),
              tap((event) => {
                switch (event.type) {
                  case PlayerEventType.PLAYER_PLAYBACK_PROGRESS:
                    this.handlePlayerPlaybackProgress();
                    return;
                  case PlayerEventType.PLAYER_PAUSE:
                    this.playControlState.set('play');
                    return;
                  case PlayerEventType.PLAYER_PLAY:
                    this.playControlState.set('pause');
                    return;
                  case PlayerEventType.PLAYER_ENDED:
                    this.playControlState.set('replay');
                    this.stepOneFrameForwardsDisabled.set(true);
                    return;
                  case PlayerEventType.PLAYER_PLAYBACK_RATE_UPDATE:
                    this.playbackRateFormControl.setValue(event.data.playbackRate as PlaybackRate, {emitEvent: false});
                    return;
                  case PlayerEventType.PLAYER_MAIN_MEDIA_UNLOADING:
                    this.disableControls();
                    return;
                }
              })
            ),

            omakasePlayer.player.text.onEvent$.pipe(
              tap((event) => {
                switch (event.type) {
                  case PlayerTextEventType.PLAYER_TEXT_TRACK_LOADED:
                  case PlayerTextEventType.PLAYER_TEXT_TRACK_UNLOADED:
                    this.resolveTextControls();
                    return;
                  case PlayerTextEventType.PLAYER_TEXT_CHANGE:
                    this.textVisibilityControlState.set(event.data.playerText.shown ? 'show' : 'hide');
                    return;
                }
              })
            ),

            omakasePlayer.player.audio.onEvent$.pipe(
              tap((event) => {
                switch (event.type) {
                  case PlayerAudioEventType.PLAYER_AUDIO_TRACK_LOADED:
                  case PlayerAudioEventType.PLAYER_AUDIO_TRACK_UNLOADED:
                    this.resolveAudioSelectVisibility();
                    break;
                }
              })
            ),

            omakasePlayer.player.audio.getHandler(PlayerAudioType.OUTPUT)!.onEvent$.pipe(
              tap((event) => {
                if (event.type === AudioHandlerEventType.AUDIO_HANDLER_CHANGE) {
                  this.muteControlState.set(event.data.state.muted ? 'unmute' : 'mute');
                  this.volumeFormControl.setValue(event.data.state.volume, {emitEvent: false});
                }
              })
            ),

            this.playbackRateFormControl.valueChanges.pipe(
              tap((playbackRate) => {
                if (playbackRate) {
                  omakasePlayer.player.setPlaybackRate(playbackRate);
                }
              })
            ),

            this.volumeFormControl.valueChanges.pipe(
              tap((volume) => {
                if (volume !== null) {
                  omakasePlayer.player.audio.getHandler(PlayerAudioType.OUTPUT)!.setVolume(volume);
                }
              })
            )
          );
        }),
        takeUntil(this.destroyed$)
      )
      .subscribe();

    combineLatest([this.markerTrack$, this.playerService.observeMediaLoads(this.destroyed$)])
      .pipe(takeUntil(this.destroyed$))
      .subscribe(([markerTrack, omakasePlayer]) => {
        if (!omakasePlayer || !markerTrack) {
          if (omakasePlayer && this.renderedMarkerTrackChromingHandler()) {
            omakasePlayer.chroming.deleteMarkerBar(this.renderedMarkerTrackChromingHandler()!.id);
          }
          this.renderedMarkerTrackChromingHandler.set(undefined);
          return;
        }

        this.createMarkerTrack(markerTrack);
      });

    this.playerService.onCreated$
      .pipe(
        switchMap((omakasePlayer) => {
          if (!omakasePlayer) return EMPTY;
          return omakasePlayer.ui.onEvent$.pipe(filter((event) => event.type === UiEventType.UI_ELEMENT_UPDATED));
        }),
        takeUntil(this.destroyed$)
      )
      .subscribe((event) => {
        const ui = this.playerService.omakasePlayer!.ui;
        const focused = !!event.data.element.props?.focused;
        ui.updateStyleRule<MarkerOnMarkerListStyle>({id: event.data.element.id, style: {highlightMarker: focused}});
        ui.updateStyleRule<MarkerOnChromingStyle>({id: event.data.element.id, style: {active: focused}});
      });

    this.playerService
      .observeMediaLoads(this.destroyed$)
      .pipe(takeUntil(this.destroyed$))
      .subscribe((omakasePlayer) => {
        if (!omakasePlayer) {
          this.appendedMarkerHelpMenuGroup = false;
          return;
        }
        if (!this.appendedMarkerHelpMenuGroup) {
          omakasePlayer.chroming.addHelpMenuGroup(MarkerShortcutUtil.getKeyboardShortcutsHelpMenuGroup('unknown'), HelpMenuGroupInsertPosition.APPEND);
          this.appendedMarkerHelpMenuGroup = true;
        }
      });
  }

  ngAfterViewInit(): void {
    // keep the marker list the same height as the player column
    this.resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        const height = this.leftSideRef.nativeElement.offsetHeight;
        this.rightSideRef.nativeElement.style.height = `${height}px`;
      });
    });
    this.resizeObserver.observe(this.leftSideRef.nativeElement);

    this.panelResizeObserver = new ResizeObserver((entries) => {
      requestAnimationFrame(() => {
        for (const entry of entries) {
          this.onUpperPanelResize(entry.contentRect.width);
        }
      });
    });
    this.panelResizeObserver.observe(this.upperControlPanelRef.nativeElement);
  }

  private onUpperPanelResize(width: number) {
    if (width < 350) {
      this.numberOfColumns.set(1);
    } else if (width < 500) {
      this.numberOfColumns.set(2);
    } else if (width < 600) {
      this.numberOfColumns.set(3);
    } else {
      this.numberOfColumns.set(4);
    }

    this.selectContainerFlexDirection.set(width < 600 ? 'column' : 'row');
    this.playbackControlGroupingGrid.set(this.numberOfColumns() > 1 ? `"a b c" "d d d"` : `"a b" "d d"`);
    this.groupingColumnTemplate.set(this.numberOfColumns() === 4 ? '1fr 1fr' : '1fr');
  }

  private enableControls() {
    this.playControlDisabled.set(false);
    this.playControlState.set('play');
    this.stepOneFrameForwardsDisabled.set(false);
    this.muteControlDisabled.set(false);
    this.fullScreenDisabled.set(false);
    this.playbackRateFormControl.enable();
    this.volumeFormControl.enable();
  }

  private disableControls() {
    this.playControlDisabled.set(true);
    this.playControlState.set('play');
    this.stepOneFrameForwardsDisabled.set(true);
    this.stepOneFrameBackwardsDisabled.set(true);
    this.muteControlDisabled.set(true);
    this.muteControlState.set('mute');
    this.fullScreenDisabled.set(true);
    this.textVisibilityControlDisabled.set(true);
    this.playbackRateFormControl.disable();
    this.volumeFormControl.disable();
  }

  private handlePlayerPlaybackProgress() {
    const omakasePlayer = this.playerService.omakasePlayer!;
    const frame = omakasePlayer.player.getCurrentTime(MediaTemporalFormat.FRAME_COUNT);
    const isEnded = omakasePlayer.player.playerSession.playback.ended;

    this.stepOneFrameBackwardsDisabled.set(frame <= 0);
    this.stepOneFrameForwardsDisabled.set(isEnded);

    if (this.playControlState() === 'replay' && !isEnded) {
      this.playControlState.set(omakasePlayer.player.playerSession.playback.playing ? 'pause' : 'play');
    }
  }

  private resolveAudioSelectVisibility() {
    const omakasePlayer = this.playerService.omakasePlayer!;
    const numberOfEmbeddedAudios = omakasePlayer.player.audio.state.tracks[PlayerAudioType.MAIN].length;
    const numberOfSidecarAudios = omakasePlayer.player.audio.state.tracks[PlayerAudioType.SIDECAR].length;
    this.audioSelectVisible.set(numberOfEmbeddedAudios + numberOfSidecarAudios > 1);
  }

  private resolveTextControls() {
    const tracks = this.playerService.omakasePlayer!.player.text.getTracks();
    this.textSelectVisible.set(tracks.length > 1);
    this.textVisibilityControlDisabled.set(tracks.length === 0);
  }

  public handlePlayControlButtonClick() {
    if (this.playControlDisabled()) {
      return;
    }
    const omakasePlayer = this.playerService.omakasePlayer!;
    switch (this.playControlState()) {
      case 'play':
        omakasePlayer.player.play();
        break;
      case 'pause':
        omakasePlayer.player.pause();
        break;
      case 'replay':
        omakasePlayer.player.seekTo(0, MediaTemporalFormat.FRAME_COUNT).subscribe(() => omakasePlayer.player.play());
        break;
    }
  }

  public stepNFrames(numberOfFrames: number) {
    if (numberOfFrames > 0 ? this.stepOneFrameForwardsDisabled() : this.stepOneFrameBackwardsDisabled()) {
      return;
    }

    const omakasePlayer = this.playerService.omakasePlayer!;

    omakasePlayer.player.pause().subscribe(() => {
      omakasePlayer.player.seekFromCurrentTime(numberOfFrames, MediaTemporalFormat.FRAME_COUNT).subscribe();
    });
  }

  public handleMuteControlClick() {
    if (this.muteControlDisabled()) {
      return;
    }
    this.playerService.omakasePlayer!.player.audio.getHandler(PlayerAudioType.OUTPUT)!.toggleMuted();
  }

  public handleTextVisibilityClick() {
    if (this.textVisibilityControlDisabled()) {
      return;
    }
    this.playerService.omakasePlayer!.player.text.toggleShowHide();
  }

  public handleFullscreenClick() {
    if (this.fullScreenDisabled()) {
      return;
    }
    this.playerService.omakasePlayer!.player.toggleFullScreen();
  }

  private createMarkerTrack(markerTrack: SidecarMarkerTrack) {
    const omakasePlayer = this.playerService.omakasePlayer;
    if (!omakasePlayer) {
      console.warn("player is undefined, can't create marker list");
      return;
    }

    if (this.renderedMarkerTrackChromingHandler()) {
      omakasePlayer.chroming.deleteMarkerBar(this.renderedMarkerTrackChromingHandler()!.id);
    }

    omakasePlayer.chroming
      .addMarkerBar(
        TrackSource.of(markerTrack.id!),
        ChromingTrackDestination.MARKER_BARS,
        {trackType: TrackType.MARKER_TRACK},
        {
          visible: true,
        }
      )
      .subscribe((chromingHandler) => {
        this.renderedMarkerTrackChromingHandler.set(chromingHandler);

        chromingHandler.onEvent$
          .pipe(
            filter((event) => event.type === ChromingMarkerBarEventType.CHROMING_MARKER_BAR_ITEM_CLICK),
            takeUntil(this.destroyed$)
          )
          .subscribe((event) => {
            this.onMarkerClick(event.data.item.id);
          });
      });
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeypress(event: KeyboardEvent) {
    if (this.playerService.omakasePlayer) {
      const handled = MarkerShortcutUtil.handleKeyboardEvent(event, this.playerService.omakasePlayer, this.renderedMarkerTrack(), (markerId) => this.setMarkerFocus(markerId));
      if (handled) {
        event.preventDefault();
      }
    }
  }

  onMarkerListEvent(event: MarkerListEvent) {
    if (event.type !== MarkerListEventType.MARKER_LIST_ITEM_CLICK) {
      return;
    }
    this.onMarkerClick(event.data.item.id);
  }

  onMarkerClick(markerId: string) {
    const omakasePlayer = this.playerService.omakasePlayer;
    if (!omakasePlayer) return;

    this.setMarkerFocus(markerId);

    const markerTrack = this.renderedMarkerTrack();
    const marker = markerTrack?.getTimedItem(markerId);
    if (!marker) return;

    const start = TimedItemTemporalUtil.extractStartTime(marker.temporal);
    if (start == null) return;

    const duration = omakasePlayer.player.mainMedia?.state.duration ?? 0;
    if (start > duration) return;

    const pause$ = omakasePlayer.player.playerSession.playback.playing ? omakasePlayer.player.pause() : of(undefined);
    pause$.subscribe(() => omakasePlayer.player.seekTo(start).subscribe());
  }

  private setMarkerFocus(markerId: string) {
    const ui = this.playerService.omakasePlayer!.ui;
    const activeElement = ui.elements.find((element) => element.props?.focused);
    if (activeElement) {
      ui.updateElement({id: activeElement.id, props: {focused: void 0}});
    }
    if (markerId !== activeElement?.id) {
      ui.updateElement({id: markerId, props: {focused: true}});
    }
  }
}

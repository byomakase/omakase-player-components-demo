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

import {Component, computed, CUSTOM_ELEMENTS_SCHEMA, effect, inject, OnDestroy, OnInit, signal, ChangeDetectionStrategy} from '@angular/core';
import {PlayerComponent} from '../../player/player.component';
import {toObservable} from '@angular/core/rxjs-interop';
// import {MarkerTrackApi, MomentMarker, PeriodMarker} from '@byomakase/omakase-player';
import {Subject, filter, take, takeUntil, skip, BehaviorSubject, combineLatest, Observable, skipUntil} from 'rxjs';
import {MarkerTrackService, SidecarMarkerTrack} from '../../fly-outs/add-markers-fly-out/marker-track.service';
import {PlayerService} from '../../player/player.service';
import {ColorService} from '../../../common/services/color.service';
import {SimpleLayoutConfigProviderService, SimpleLayoutTheme} from '../../layout-menu/config-providers/simple-layout-config-provider.service';
import {SessionService} from '../../../common/session/session.service';
import {
  AudioHandlerApi,
  MediaTemporalFormat,
  PlayerAudioEventType,
  PlayerAudioMode,
  PlayerSidecarAudioTrack,
  PlayerAudioTrackState,
  PlayerAudioType,
  PlayerEventType,
  PlayerAudioTrack,
  PlayerAudioState,
  AudioState,
  PlayerTextTrackState,
  PlayerTextEventType,
  ChromingMarkerBarHandlerApi,
  OmakaseDropdownList,
  OmakaseDropdownToggle,
  ChromingTrackDestination,
  TrackSource,
  TrackType,
  SessionEventType,
  WindowPlaybackMode,
  MarkerTrackState,
} from '@byomakase/omakase-player';
import {SidecarAudioService} from '../../fly-outs/add-sidecar-audio-fly-out/sidecar-audio-service/sidecar-audio.service';
import {FormArray, FormControl, ReactiveFormsModule} from '@angular/forms';
import {AudioHandlerDisplayComponent} from './audio-handler-display.component';
import {OutputAudioHandlerDisplayComponent} from './output-audio-handler-display.component';
import {SidecarTextService} from '../../fly-outs/add-sidecar-text-fly-out/text-sidecar.service';
import {StringUtil} from '../../../common/util/string-util';
import {number} from 'zod';

interface AudioTrackRadioOption {
  label: string;
  value: string;
}

interface AudioTrackCheckbox {
  id: string;
  control: FormControl<boolean | null>;
  label: string;
}

interface MarkerDropdownOptions {
  value: string | undefined;
  label: string;
  active: boolean;
}

@Component({
  selector: 'app-media-handlers-layout',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [PlayerComponent, ReactiveFormsModule, AudioHandlerDisplayComponent, OutputAudioHandlerDisplayComponent],
  host: {'class': 'media-handlers-layout'},
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="left-side">
      <div class="player-container">
        <app-player> </app-player>
      </div>
      @if (isVideoLoaded()) {
        <div class="playback-controls">
          <button (click)="seekFrames(-1)">-f</button>
          <button (click)="togglePlayPause()">
            @if (isMediaPaused()) {
              Play
            } @else {
              Pause
            }
          </button>
          <button (click)="seekFrames(1)">f</button>
          @if (outputAudioHandler()) {
            <app-output-audio-handler-display [audioHandler]="outputAudioHandler()!"></app-output-audio-handler-display>
          }
        </div>
      }
      <div class="sidecar-controls">
        <div class="track-select-grouping">
          @if (hasAudioTracks()) {
            <div class="track-controls-header">Audio</div>
          }
          @if (isMultiAudio()) {
            @for (singularCheckboxControl of audioTrackCheckboxControls; track singularCheckboxControl.id) {
              <div class="label">
                <input [id]="singularCheckboxControl.id" type="checkbox" [formControl]="singularCheckboxControl.control" />
                <span [title]="singularCheckboxControl.label">{{ singularCheckboxControl.label }}</span>
              </div>
            }
          } @else {
            @for (option of audioTrackRadioOptions(); track option.value) {
              <div class="label">
                <input type="radio" name="audio-radio" [id]="option.value" [formControl]="audioTrackRadioControl" [value]="option.value" />
                <span [title]="option.label">{{ option.label }}</span>
              </div>
            }
          }
        </div>
        <div class="track-select-grouping">
          @if (textTrackRadioOptions().length > 0) {
            <div class="track-controls-header">Text</div>
          }
          @for (option of textTrackRadioOptions(); track option.value) {
            <div class="label">
              <input type="radio" name="text-radio" [id]="option.value" [formControl]="textTrackRadioControl" [value]="option.value" />
              <span [title]="option.label">{{ option.label }}</span>
            </div>
          }
        </div>
      </div>
    </div>
    <div class="right-side">
      @for (audioHandlerOption of audioHandlersOptions(); track audioHandlerOption.id) {
        <app-audio-handler-display
          [audioHandler]="audioHandlerOption.handler"
          [label]="audioHandlerOption.label"
          [audioState]="audioHandlerOption.track"
          [isMain]="audioHandlerOption.isMain ?? false"
        ></app-audio-handler-display>
      }
    </div>
    <template id="omakase-chroming-marker-track-select">
      <omakase-dropdown slot="dropdown-container" alignment="left" id="marker-track-dropdown">
        <omakase-dropdown-list type="radio" title="MARKER TRACKS" width="200" class="marker-track-dropdown-list" id="marker-track-dropdown-list"> </omakase-dropdown-list>
      </omakase-dropdown>
      <omakase-dropdown-toggle slot="end-container" class="marker-track-dropdown-toggle" dropdown="marker-track-dropdown">
        <media-chrome-button class="media-chrome-button">
          <span></span>
        </media-chrome-button>
      </omakase-dropdown-toggle>
    </template>
  `,
})
export class MediaHandlersLayoutComponent implements OnDestroy, OnInit {
  public markerTrackService = inject(MarkerTrackService);
  private destroyed$ = new Subject<void>();
  public simpleLayoutConfigProviderService = inject(SimpleLayoutConfigProviderService);

  public renderedMarkerTrack = signal<ChromingMarkerBarHandlerApi | undefined>(undefined);

  // replay subject with replay value of 1, first value should be skipped
  // inspected in angular source code, possibly subjected to change
  private markerTrack$ = toObservable<SidecarMarkerTrack | undefined>(this.markerTrackService.activeMarkerTrack);

  private playerService = inject(PlayerService);
  private sidecarAudioService = inject(SidecarAudioService);
  private colorService = inject(ColorService);

  public isVideoLoaded = signal<boolean>(false);
  public isMultiAudio = signal<boolean>(false);
  public isMediaPaused = signal<boolean>(true);
  private mainAudioHandler = signal<AudioHandlerApi | undefined>(undefined);
  private mainAudioHandlerId = computed(() => {
    this.mainAudioHandler();
    return crypto.randomUUID();
  });
  public outputAudioHandler = signal<AudioHandlerApi | undefined>(undefined);

  private mainAudioTracks = signal<PlayerAudioTrackState[]>([]);
  audioTrackRadioControl = new FormControl<string | null>(null);
  audioTrackCheckboxControls: AudioTrackCheckbox[] = [];

  private mainTextTracks = signal<PlayerTextTrackState[]>([]);
  private sidecarTextTracks = signal<PlayerTextTrackState[]>([]);
  textTrackRadioControl = new FormControl<string | null>(null);

  private populateMarkerSelector$ = new Subject<void>();
  private markerDropdownOptions: MarkerDropdownOptions[] = [];
  private isMainMediaUnloading = false;
  private isDetached = signal(false);

  public audioTrackRadioOptions = computed(() => {
    this.mainAudioTracks();
    this.sidecarAudioService.loadedSidecarAudios();
    if (this.isMainMediaUnloading || !this.playerService.omakasePlayer) {
      return [];
    }
    const options = [
      ...this.mainAudioTracks().map((track, index) => {
        const trackState = this.playerService!.omakasePlayer!.track.get(track.trackId)!.state;

        return {
          label: trackState.label ?? `Main audio ${index + 1}`,
          value: track.trackId,
        };
      }),
      ...this.sidecarAudioService.loadedSidecarAudios().map((sidecar, index) => {
        const trackState = this.playerService!.omakasePlayer!.track.get(sidecar.id!)!.state;

        return {
          label: trackState.label ?? `Sidecar audio ${index + 1}`,
          value: sidecar.id!,
        };
      }),
    ];
    return options;
  });

  public textTrackRadioOptions = computed(() => {
    this.mainTextTracks();
    this.sidecarTextTracks();
    if (this.isMainMediaUnloading || !this.playerService.omakasePlayer) {
      return [];
    }
    const options = [
      ...this.mainTextTracks().map((track, index) => {
        const trackState = this.playerService!.omakasePlayer!.track.get(track.trackId)!.state;
        return {
          label: trackState.label ?? `Main text ${index + 1}`,
          value: track.trackId,
        };
      }),
      ...this.sidecarTextTracks().map((sidecar, index) => {
        const trackState = this.playerService!.omakasePlayer!.track.get(sidecar.trackId)!.state;

        return {
          label: trackState.label ?? `Sidecar text ${index + 1}`,
          value: sidecar.trackId,
        };
      }),
    ];

    return options;
  });

  public hasAudioTracks = computed(() => this.audioTrackRadioOptions().length > 0);

  public audioHandlersOptions = computed(() => {
    this.sidecarAudioService.loadedSidecarAudios();
    this.mainAudioHandler();
    this.isDetached();
    if (this.isMainMediaUnloading) {
      return [];
    }
    const audioHandlers: {handler: AudioHandlerApi; label: string; track?: AudioState | undefined; isMain?: boolean; id: string}[] = [];

    if (this.mainAudioHandler()) {
      audioHandlers.push({handler: this.mainAudioHandler()!, label: 'Main Audio Handler', isMain: true, id: this.mainAudioHandlerId()});
    }

    if (this.sidecarAudioService.loadedSidecarAudios()) {
      const sidecarAudioIds = this.sidecarAudioService.loadedSidecarAudios().map((sidecar) => sidecar.id!);
      const sidecarAudioHandlers = sidecarAudioIds.map((id) => this.playerService.omakasePlayer!.player.audio.getHandler(PlayerAudioType.SIDECAR, id)!);
      const sidecarAudioTracks = sidecarAudioIds.map((id) => this.playerService.omakasePlayer!.player.audio.getTracks(PlayerAudioType.SIDECAR).find((track) => track.id === id)!);
      audioHandlers.push(
        ...sidecarAudioHandlers.map((handler, index) => ({
          handler: handler,
          label: `${sidecarAudioTracks.at(index)?.label ?? `Sidecar audio ${index + 1}`} Audio Handler`,
          track: sidecarAudioTracks.at(index)!.state,
          id: sidecarAudioTracks.at(index)!.id,
        }))
      );
    }

    return audioHandlers;
  });

  ngOnInit(): void {
    this.audioTrackRadioControl.valueChanges.subscribe((value) => {
      const omakasePlayer = this.playerService.omakasePlayer;

      if (!omakasePlayer || !value) {
        return;
      }

      omakasePlayer.player.audio.switchTrack(value);
    });

    this.textTrackRadioControl.valueChanges.subscribe((value) => {
      const omakasePlayer = this.playerService.omakasePlayer;

      if (!omakasePlayer || !value) {
        return;
      }

      omakasePlayer.player.text.switchTrack(value);
    });
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  constructor() {
    // resolve new dropdown options for chroming
    effect(() => {
      this.markerDropdownOptions = this.markerTrackService.loadedMarkerTracks().map((markerTrack) => {
        return {
          value: markerTrack.id,
          label: markerTrack.label ?? StringUtil.leafUrlToken(markerTrack.src),
          active: markerTrack.id === this.markerTrackService.activeMarkerTrack()?.id,
        };
      });

      this.populateMarkerSelector$.next();
    });

    this.populateMarkerSelector$.pipe().subscribe(() => {
      if (!this.playerService.omakasePlayer) {
        return;
      }
      const dropdown = this.playerService.omakasePlayer!.chroming.getPlayerChromingElement<OmakaseDropdownList>('#marker-track-dropdown-list');
      const dropdownToggle = this.playerService.omakasePlayer!.chroming.getPlayerChromingElement<OmakaseDropdownToggle>('.marker-track-dropdown-toggle');
      dropdown.setOptions(this.markerDropdownOptions);
      if (this.markerDropdownOptions.length === 0) {
        dropdownToggle.setAttribute('disabled', '');
      } else {
        dropdownToggle.removeAttribute('disabled');
      }
      dropdown.selectedOption$.pipe(takeUntil(this.destroyed$)).subscribe((dropdownItem) => {
        if (dropdownItem) {
          this.markerTrackService.activeMarkerTrack.set(this.markerTrackService.markerTracks().find((markerTrack) => markerTrack.id === dropdownItem.value));
        }
      });
    });

    // on selected marker track change draw new marker visualization
    this.markerTrack$.subscribe((markerTrack) => {
      if (!markerTrack) {
        this.playerService.omakasePlayer?.chroming.deleteMarkerBar(ChromingTrackDestination.MARKER_BARS);
        this.renderedMarkerTrack.set(undefined);
        return;
      }
      this.createMarkerTrack(markerTrack);
    });

    this.playerService.onCreated$.pipe(takeUntil(this.destroyed$)).subscribe((omakasePlayer) => {
      if (!omakasePlayer) {
        this.reset();
        this.isMainMediaUnloading = false;
        return;
      }

      // track attach and detach and reset the handlers
      this.playerService
        .omakasePlayer!.session.onEvent$.pipe(
          filter((event) => event.type === SessionEventType.SESSION_WINDOW_PLAYBACK_UPDATED),
          takeUntil(this.destroyed$)
        )
        .subscribe((event) => {
          if (event.data.windowPlayback.mode === WindowPlaybackMode.ATTACHED) {
            this.isDetached.set(false);
            this.outputAudioHandler.set(omakasePlayer.player.audio.getHandler(PlayerAudioType.OUTPUT));
            this.mainAudioHandler.set(omakasePlayer.player.audio.getHandler(PlayerAudioType.MAIN));
            this.populateMarkerSelector$.next(); //redraw marker chroming selector on attach
          } else if (event.data.windowPlayback.mode === WindowPlaybackMode.DETACHED) {
            this.isDetached.set(true);
            this.outputAudioHandler.set(omakasePlayer.player.audio.getHandler(PlayerAudioType.OUTPUT));
            this.mainAudioHandler.set(omakasePlayer.player.audio.getHandler(PlayerAudioType.MAIN));
          }
        });

      omakasePlayer.player.onEvent$
        .pipe(
          filter((event) => event.type === PlayerEventType.PLAYER_MAIN_MEDIA_UNLOADING),
          takeUntil(this.destroyed$)
        )
        .subscribe(() => {
          this.isMainMediaUnloading = true;
          this.reset();
          return;
        });

      omakasePlayer.player.onEvent$
        .pipe(filter((event) => event.type === PlayerEventType.PLAYER_MAIN_MEDIA_LOADED))
        .pipe(takeUntil(this.destroyed$))
        .subscribe((videoLoadedEvent) => {
          this.isMainMediaUnloading = false;

          if (!videoLoadedEvent) {
            this.isVideoLoaded.set(false);
            return;
          }

          this.isVideoLoaded.set(true);
          const isMultiAudio = omakasePlayer.player.audio.state.audioMode === PlayerAudioMode.MULTIPLE;
          this.isMultiAudio.set(isMultiAudio);
          this.mainAudioTracks.set(omakasePlayer.player.playerSession.audio!.tracks['MAIN']);
          this.mainTextTracks.set(omakasePlayer.player.playerSession.text!.tracks['MAIN']);
          this.mainAudioHandler.set(omakasePlayer.player.audio.getHandler(PlayerAudioType.MAIN));
          this.outputAudioHandler.set(omakasePlayer.player.audio.getHandler(PlayerAudioType.OUTPUT));
          this.isMediaPaused.set(true);

          this.populateMarkerSelector$.next();

          if (!isMultiAudio) {
            // options are handled with computed signal
            this.audioTrackRadioControl.reset();
            this.audioTrackRadioControl.setValue(omakasePlayer.player.playerSession.audio!.tracks['MAIN'].find((track) => track.active)!.trackId);
          } else {
            omakasePlayer.player.playerSession.audio!.tracks['MAIN'].forEach((trackState, index) => {
              const formControl = new FormControl<boolean | null>(trackState.active);
              formControl.valueChanges.subscribe((newValue) => {
                omakasePlayer.player.audio.switchTrack(trackState.trackId, !!newValue);
              });
              this.audioTrackCheckboxControls.push({control: formControl, id: trackState.trackId, label: `Main Audio ${index + 1}`});
            });
          }

          const activeTextTrackId = omakasePlayer.player.text.state.tracks['MAIN'].find((track) => track.active)?.trackId;
          if (activeTextTrackId) {
            this.textTrackRadioControl.setValue(activeTextTrackId);
          }
        });

      omakasePlayer.player.onEvent$
        .pipe(filter((event) => event.type === PlayerEventType.PLAYER_PLAY || event.type === PlayerEventType.PLAYER_PAUSE))
        .pipe(takeUntil(this.destroyed$))
        .subscribe((playPauseEvent) => {
          if (playPauseEvent.type === PlayerEventType.PLAYER_PLAY) {
            this.isMediaPaused.set(false);
          } else {
            this.isMediaPaused.set(true);
          }
        });

      omakasePlayer.player.audio.onEvent$
        .pipe(filter((event) => event.type === PlayerAudioEventType.PLAYER_AUDIO_TRACK_SWITCHED))
        .pipe(takeUntil(this.destroyed$))
        .subscribe((audioSwitchedEvent) => {
          if (!this.isMultiAudio()) {
            const activeTrack = audioSwitchedEvent.data.playerAudio.tracks['MAIN'].find((track) => track.active) ?? audioSwitchedEvent.data.playerAudio.tracks['SIDECAR'].find((track) => track.active);
            if (activeTrack) {
              this.audioTrackRadioControl.setValue(activeTrack.trackId, {emitEvent: false});
            }
          } else {
            [...audioSwitchedEvent.data.playerAudio.tracks['MAIN'], ...audioSwitchedEvent.data.playerAudio.tracks['SIDECAR']].forEach((track) => {
              this.audioTrackCheckboxControls.forEach((audioCheckboxControl) => {
                if (audioCheckboxControl.id === track.trackId) {
                  audioCheckboxControl.control.setValue(track.active, {emitEvent: false});
                }
              });
            });
          }
        });

      omakasePlayer.player.audio.onEvent$
        .pipe(
          filter((event) => event.type === PlayerAudioEventType.PLAYER_AUDIO_TRACK_LOADED),
          takeUntil(this.destroyed$)
        )
        .subscribe((event) => {
          if (this.audioTrackCheckboxControls.some((checkboxControl) => checkboxControl.id === event.data.playerAudioTrack.trackId)) {
            return;
          }
          const formControl = new FormControl<boolean>(event.data.playerAudioTrack.active);
          formControl.valueChanges.subscribe((newValue) => {
            omakasePlayer.player.audio.switchTrack(event.data.playerAudioTrack.trackId, !!newValue);
          });
          const track = omakasePlayer.track.get(event.data.playerAudioTrack.trackId)!;
          this.audioTrackCheckboxControls.push({
            control: formControl,
            id: event.data.playerAudioTrack.trackId,
            label: track.state.label ?? `Sidecar audio ${this.sidecarAudioService.loadedSidecarAudios().length}`,
          });
        });

      omakasePlayer.player.audio.onEvent$
        .pipe(
          filter((event) => event.type === PlayerAudioEventType.PLAYER_AUDIO_TRACK_UNLOADED),
          takeUntil(this.destroyed$)
        )
        .subscribe((event) => {
          this.audioTrackCheckboxControls = this.audioTrackCheckboxControls.filter((checkboxControl) => checkboxControl.id !== event.data.playerAudioTrack.trackId);
        });

      omakasePlayer.player.text.onEvent$
        .pipe(
          filter((event) => event.type === PlayerTextEventType.PLAYER_TEXT_CHANGE),
          takeUntil(this.destroyed$)
        )
        .subscribe((event) => {
          const activeTrack = event.data.playerText.tracks['MAIN'].find((track) => track.active && track.shown) ?? event.data.playerText.tracks['SIDECAR'].find((track) => track.active && track.shown);
          activeTrack && this.textTrackRadioControl.setValue(activeTrack.trackId, {emitEvent: false});
        });

      omakasePlayer.player.text.onEvent$
        .pipe(
          filter((event) => event.type === PlayerTextEventType.PLAYER_TEXT_TRACK_LOADED),
          takeUntil(this.destroyed$)
        )
        .subscribe((event) => {
          this.sidecarTextTracks.update((prev) => (prev.some((track) => track.trackId === event.data.playerTextTrack.trackId) ? prev : [...prev, event.data.playerTextTrack]));
        });

      omakasePlayer.player.text.onEvent$
        .pipe(
          filter((event) => event.type === PlayerTextEventType.PLAYER_TEXT_TRACK_UNLOADED),
          takeUntil(this.destroyed$)
        )
        .subscribe((event) => {
          this.sidecarTextTracks.update((prev) => prev.filter((track) => track.trackId !== event.data.playerTextTrack.trackId));
        });
    });
  }

  private createMarkerTrack(markerTrack: SidecarMarkerTrack) {
    const omakasePlayer = this.playerService.omakasePlayer;
    if (!omakasePlayer) {
      console.warn("player is undefined, can't create marker list");
      return;
    }

    if (this.renderedMarkerTrack()) {
      omakasePlayer.chroming.deleteMarkerBar(this.renderedMarkerTrack()!.id);
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
      .subscribe((markerTrack) => {
        this.renderedMarkerTrack.set(markerTrack);
      });
  }

  seekFrames(numberOfFrames: number) {
    this.playerService.omakasePlayer?.player.seekFromCurrentTime(numberOfFrames, MediaTemporalFormat.FRAME_COUNT);
  }

  togglePlayPause() {
    const omakasePlayer = this.playerService.omakasePlayer;

    if (!omakasePlayer) {
      return;
    }

    if (omakasePlayer.player.playerSession.playback.playing) {
      omakasePlayer.player.pause();
    } else {
      omakasePlayer.player.play();
    }
  }

  reset() {
    this.isVideoLoaded.set(false);
    this.mainAudioHandler.set(undefined);
    this.outputAudioHandler.set(undefined);
    this.audioTrackCheckboxControls = [];
    this.mainTextTracks.set([]);
    this.sidecarTextTracks.set([]);
    this.mainAudioTracks.set([]);
  }
}

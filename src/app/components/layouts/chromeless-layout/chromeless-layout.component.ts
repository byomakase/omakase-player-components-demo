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

import {AfterViewInit, Component, CUSTOM_ELEMENTS_SCHEMA, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import {PlayerComponent} from '../../player/player.component';
import {Subject, filter, merge, BehaviorSubject, switchMap, tap, EMPTY} from 'rxjs';
import {MarkerTrackService} from '../../fly-outs/add-markers-fly-out/marker-track.service';
import {PlayerService} from '../../player/player.service';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {timecodeValidator} from '../../../common/validators/timecode-validator';
import {SidecarTextSelectComponent} from '../../../common/controls/text-select/text-select.component';
import {TimecodeDisplay} from '../../../common/timecode-display/timecode-display.component';
import {SidecarAudioSelectComponent} from '../../../common/controls/audio-select/audio-select.component';
import {AudioHandlerEventType, MediaTemporalFormat, PlayerAudioEventType, PlayerAudioType, PlayerEventType, PlayerTextEventType, VideoSafeZone} from '@byomakase/omakase-player';

type PlayControlState = 'play' | 'pause';
type TextVisibilityState = 'show' | 'hide';
type PlaybackRate = 1 | 2 | 4 | 8 | 0.5 | 0.25 | 0.75;
type MuteState = 'mute' | 'unmute';
type PipState = 'active' | 'inactive';
type SafeZoneRatio = 'title-safe' | 'action-safe';

@Component({
  selector: 'app-chromeless-layout',
  imports: [PlayerComponent, ReactiveFormsModule, SidecarAudioSelectComponent, SidecarTextSelectComponent, TimecodeDisplay],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  host: {'class': 'chromeless-layout'},
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="left-side">
      <div class="player-wrapper">
        <app-player></app-player>
      </div>
      <div class="lower-control-panel">
        <div class="select-container">
          @if (audioSelectVisible()) {
            <div class="select-wrapper">
              <div class="select-label">Audio</div>
              <app-audio-select />
            </div>
          }
          @if (textSelectVisible()) {
            <div class="select-wrapper">
              <div class="select-label">Text</div>
              <app-text-select />
            </div>
          }
        </div>
        <app-timecode-display [timecode$]="timecode$" />
      </div>
    </div>
    <div class="right-side">
      <button [disabled]="playControlButtonDisabled()" class="control-button" (click)="togglePlayPause()">
        @if (playControlState() === 'play') {
          Play
        } @else {
          Pause
        }
      </button>
      <button [disabled]="stepOneFrameForwardsDisabled()" class="control-button long" (click)="stepNFrames(1)">Step 1 frame forwards</button>
      <button [disabled]="stepOneFrameBackwardsDisabled()" class="control-button long" (click)="stepNFrames(-1)">Step 1 frame backwards</button>
      <div class="jump-to-control-wrapper">
        <button [disabled]="jumpDisabled()" class="control-button" (click)="seekToTimecodeControl()">Jump to...</button>
        <input [formControl]="timecodeFormControl" type="text" />
      </div>
      <div class="safezone-wrapper">
        <button [disabled]="safeZoneDisabled()" class="control-button" (click)="toggleSafeZone()">
          @if (isSafeZoneSet()) {
            Hide Safezone
          } @else {
            Show Safezone
          }
        </button>
        <select [formControl]="safeZoneFormControl">
          @for (option of safeZoneOptions; track option.at(0)) {
            <option [value]="option.at(0)">{{ option.at(1) }}</option>
          }
        </select>
      </div>
      <div class="two-column-container">
        <div class="column">
          <select [formControl]="playbackRateFormControl">
            @for (playbackRate of playbackRates; track playbackRate) {
              <option [value]="playbackRate">{{ playbackRate }}x</option>
            }
          </select>
          <button [disabled]="textVisibilityButtonDisabled()" class="control-button" (click)="toggleTextVisibility()">
            @if (textVisibilityState() === 'show') {
              Hide Text
            } @else {
              Show Text
            }
          </button>
          <button class="control-button" [disabled]="muteDisabled()" (click)="toggleMute()">
            @if (muteState() === 'mute') {
              Unmute
            } @else {
              Mute
            }
          </button>
          <button [disabled]="pipDisabled()" (click)="togglePip()" class="control-button">
            @if (pipState() === 'active') {
              Deactivate PiP
            } @else {
              Activate PiP
            }
          </button>
          <button [disabled]="fullScreenDisabled()" (click)="toggleFullScreen()" class="control-button">Full Screen</button>
        </div>
        <div class="column volume-control-column">
          <div class="volume-control-wrapper">
            <div class="volume-range-wrapper">
              <input class="volume-range" type="range" step="0.01" min="0" max="1" [formControl]="volumeFormControl" />
            </div>
            <span>Volume</span>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ChromelessLayoutComponent implements AfterViewInit {
  public markerTrackService = inject(MarkerTrackService);
  private destroyed$ = new Subject<void>();

  public playControlButtonDisabled = signal<boolean>(true);
  public playControlState = signal<PlayControlState>('play');

  public stepOneFrameForwardsDisabled = signal<boolean>(true);
  public stepOneFrameBackwardsDisabled = signal<boolean>(true);

  public timecodeFormControl = new FormControl<string>('', [timecodeValidator(undefined, false)]);
  public jumpDisabled = signal<boolean>(true);

  public playbackRateFormControl = new FormControl<PlaybackRate>({value: 1, disabled: true});
  public playbackRates = [0.25, 0.5, 0.75, 1, 2, 4, 8];

  public textVisibilityButtonDisabled = signal(true);
  public textVisibilityState = signal<TextVisibilityState>('hide');

  public audioSelectVisible = signal(false);
  public textSelectVisible = signal(false);

  public muteDisabled = signal<boolean>(true);
  public muteState = signal<MuteState>('unmute');

  public volumeFormControl = new FormControl<number>(1);

  public timecode$ = new BehaviorSubject('00:00:00:00');

  public pipDisabled = signal(true);
  public pipState = signal<PipState>('inactive');

  public safeZoneFormControl = new FormControl<SafeZoneRatio>({value: 'action-safe', disabled: true});
  public safeZoneDisabled = signal(true);
  public safeZoneOptions = new Map<SafeZoneRatio, string>([
    ['action-safe', 'Action Safe'],
    ['title-safe', 'Title Safe'],
  ]);
  public isSafeZoneSet = signal(false);

  public fullScreenDisabled = signal(true);

  private playerService = inject(PlayerService);
  private _playerEventTypesOfInterest = new Set([PlayerEventType.PLAYER_PLAY, PlayerEventType.PLAYER_PAUSE, PlayerEventType.PLAYER_PLAYBACK_PROGRESS, PlayerEventType.PLAYER_MAIN_MEDIA_UNLOADING]);

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  ngAfterViewInit(): void {
    this.volumeFormControl.disable();

    this.playerService
      .observeMediaLoads(this.destroyed$)
      .pipe(
        switchMap((omakasePlayer) => {
          if (!omakasePlayer) {
            this.disableControls();
            return EMPTY;
          }
          this.enableControls();

          this.timecodeFormControl.setValidators([timecodeValidator(omakasePlayer.player.mainMedia?.frameRateModel?.value, Boolean(omakasePlayer.player.mainMedia?.frameRateModel?.dropFrames))]);
          this.resolveTextSelectVisibility();

          return merge(
            omakasePlayer.player.onEvent$.pipe(
              filter((event) => this._playerEventTypesOfInterest.has(event.type)),
              tap((event) => {
                switch (event.type) {
                  case PlayerEventType.PLAYER_PLAYBACK_PROGRESS:
                    this.handlePlayerPlaybackProgress();
                    return;
                  case PlayerEventType.PLAYER_PAUSE:
                    this.handlePlayerPause();
                    return;
                  case PlayerEventType.PLAYER_PLAY:
                    this.handlePlayerPlay();
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
                    this.textVisibilityButtonDisabled.set(false);
                    this.resolveTextSelectVisibility();
                    return;
                  case PlayerTextEventType.PLAYER_TEXT_TRACK_UNLOADED:
                    this.resolveTextSelectVisibility();
                    return;
                  case PlayerTextEventType.PLAYER_TEXT_CHANGE:
                    this.textVisibilityState.set(event.data.playerText.shown ? 'show' : 'hide');
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
                  this.muteState.set(event.data.state.muted ? 'mute' : 'unmute');
                  this.volumeFormControl.setValue(event.data.state.volume, {emitEvent: false});
                }
              })
            ),

            this.timecodeFormControl.valueChanges.pipe(tap(() => this.resolveJumpDisable())),

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
                  this.playerService.omakasePlayer!.player.audio.getHandler(PlayerAudioType.OUTPUT)!.setVolume(volume);
                }
              })
            ),

            this.safeZoneFormControl.valueChanges.pipe(
              tap(() => {
                if (this.isSafeZoneSet()) {
                  this.toggleSafeZone();
                  this.toggleSafeZone();
                }
              })
            )
          );
        })
      )
      .subscribe();
  }

  private enableControls() {
    this.playControlButtonDisabled.set(false);
    this.stepOneFrameForwardsDisabled.set(false);
    this.playbackRateFormControl.enable();
    this.playControlState.set('play');
    this.muteDisabled.set(false);
    this.pipDisabled.set(false);
    this.volumeFormControl.enable();
    this.safeZoneDisabled.set(false);
    this.safeZoneFormControl.enable();
    this.timecodeFormControl.setValue(this.resolveInitialTimecode());
    this.timecode$.next(this.resolveInitialTimecode());
    this.fullScreenDisabled.set(false);
  }

  private disableControls() {
    this.playControlButtonDisabled.set(true);
    this.stepOneFrameForwardsDisabled.set(true);
    this.stepOneFrameBackwardsDisabled.set(true);
    this.playbackRateFormControl.disable();
    this.textVisibilityButtonDisabled.set(true);
    this.muteDisabled.set(true);
    this.pipDisabled.set(true);
    this.volumeFormControl.disable();
    this.safeZoneDisabled.set(true);
    this.safeZoneFormControl.disable();
    this.fullScreenDisabled.set(true);
  }

  private handlePlayerPause() {
    this.playControlState.set('play');
    this.resolveJumpDisable();
  }

  private handlePlayerPlay() {
    this.playControlState.set('pause');
    this.resolveJumpDisable();
  }

  private handlePlayerPlaybackProgress() {
    const omakasePlayer = this.playerService.omakasePlayer!;
    const frame = omakasePlayer.player.convertTime(omakasePlayer.player.getCurrentTime(), MediaTemporalFormat.SECONDS, MediaTemporalFormat.FRAME_COUNT);
    if (frame === 0) {
      this.stepOneFrameBackwardsDisabled.set(true);
    } else {
      this.stepOneFrameBackwardsDisabled.set(false);
    }
    if (frame === omakasePlayer.player.convertTime(omakasePlayer.player.mainMedia!.duration!, MediaTemporalFormat.SECONDS, MediaTemporalFormat.FRAME_COUNT)) {
      this.stepOneFrameForwardsDisabled.set(true);
    } else {
      this.stepOneFrameForwardsDisabled.set(false);
    }

    this.timecode$.next(omakasePlayer.player.convertTime(omakasePlayer.player.getCurrentTime(), MediaTemporalFormat.SECONDS, MediaTemporalFormat.TIMECODE));
  }

  private resolveAudioSelectVisibility() {
    const numberOfEmbeddedAudios = this.playerService.omakasePlayer!.player.audio.state.tracks[PlayerAudioType.MAIN].length;
    const numberOfSidecarAudios = this.playerService.omakasePlayer!.player.audio.state.tracks[PlayerAudioType.SIDECAR].length;

    const isVisible = numberOfEmbeddedAudios + numberOfSidecarAudios > 1;
    this.audioSelectVisible.set(isVisible);
  }

  private resolveTextSelectVisibility() {
    const isVisible = this.playerService.omakasePlayer!.player.text.getTracks().length > 1;
    this.textSelectVisible.set(isVisible);
  }

  private resolveJumpDisable() {
    const omakasePlayer = this.playerService.omakasePlayer;
    if (omakasePlayer && omakasePlayer.player.mainMedia && this.timecodeFormControl.valid) {
      try {
        const isPaused = omakasePlayer.player.playerSession.playback.paused;
        const timecode = this.timecodeFormControl.value!;
        const frame = omakasePlayer.player.convertTime(timecode, MediaTemporalFormat.TIMECODE, MediaTemporalFormat.FRAME_COUNT);
        const isFrameValid = frame < omakasePlayer.player.convertTime(omakasePlayer.player.getDuration(), MediaTemporalFormat.SECONDS, MediaTemporalFormat.FRAME_COUNT);

        const isDisabled = !isFrameValid || !isPaused;
        this.jumpDisabled.set(isDisabled);
        return;
      } catch {
        // invalid timecode while user is still typing
      }
    }
    this.jumpDisabled.set(true);
  }

  public togglePlayPause() {
    if (this.playerService.omakasePlayer!.player.playerSession.playback.playing) {
      this.playerService.omakasePlayer!.player.pause();
    } else {
      this.playerService.omakasePlayer!.player.play();
    }
  }

  public async togglePip() {
    const videoElement = this.playerService.omakasePlayer!.player.htmlMediaElement as HTMLVideoElement;

    if (!videoElement) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        this.pipState.set('inactive');
      } else {
        await videoElement.requestPictureInPicture();
        this.pipState.set('active');
      }
    } catch (err) {
      console.error('Error toggling PiP:', err);
    }
  }

  public stepNFrames(numberOfFrames: number) {
    const omakasePlayer = this.playerService.omakasePlayer!;

    const currentFrame = omakasePlayer.player.convertTime(omakasePlayer.player.getCurrentTime(), MediaTemporalFormat.SECONDS, MediaTemporalFormat.FRAME_COUNT);
    const newFrame = Math.min(
      Math.max(0, currentFrame + numberOfFrames),
      omakasePlayer.player.convertTime(omakasePlayer.player.mainMedia!.duration!, MediaTemporalFormat.SECONDS, MediaTemporalFormat.FRAME_COUNT)
    );
    omakasePlayer.player.pause().subscribe(() => {
      omakasePlayer.player.seekTo(newFrame, MediaTemporalFormat.FRAME_COUNT);
    });
  }

  public seekToTimecodeControl() {
    const timecode = this.timecodeFormControl.value!;
    const frame = this.playerService.omakasePlayer!.player.convertTime(timecode, MediaTemporalFormat.TIMECODE, MediaTemporalFormat.FRAME_COUNT);
    this.playerService.omakasePlayer!.player!.seekTo(frame, MediaTemporalFormat.FRAME_COUNT);
  }

  public toggleTextVisibility() {
    this.playerService.omakasePlayer!.player.text.toggleShowHide();
  }

  public changeVolume(volume: number) {
    this.playerService.omakasePlayer!.player.audio.getHandler(PlayerAudioType.OUTPUT)!.setVolume(volume);
  }

  public toggleMute() {
    this.playerService.omakasePlayer!.player.audio.getHandler(PlayerAudioType.OUTPUT)!.toggleMuted();
  }

  public resolveInitialTimecode() {
    return this.playerService.omakasePlayer!.player.convertTime(0, MediaTemporalFormat.SECONDS, MediaTemporalFormat.TIMECODE);

    // return '00:00:00:00';
  }

  public toggleSafeZone() {
    if (this.isSafeZoneSet()) {
      this.playerService.omakasePlayer!.chroming.removeAllSafeZones();
      this.isSafeZoneSet.set(false);
    } else {
      const ratio = this.safeZoneFormControl.value!;
      this.playerService.omakasePlayer!.chroming.addSafeZone(this.resolveSafeZone(ratio)).subscribe({
        error: (err) => console.log(err),
      });
      this.isSafeZoneSet.set(true);
    }
  }

  private resolveSafeZone(safeZoneRation: SafeZoneRatio): Partial<VideoSafeZone> {
    switch (safeZoneRation) {
      case 'title-safe': {
        return {
          topRightBottomLeftPercent: [10, 10, 10, 10],
        };
      }
      case 'action-safe':
        return {
          topRightBottomLeftPercent: [7, 7, 7, 7],
        };
    }
  }

  public toggleFullScreen() {
    this.playerService.omakasePlayer!.player.toggleFullScreen();
  }
}

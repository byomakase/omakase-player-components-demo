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

import {AfterViewInit, Component, CUSTOM_ELEMENTS_SCHEMA, inject, signal} from '@angular/core';
import {PlayerComponent} from '../../player/player.component';
import {toObservable} from '@angular/core/rxjs-interop';
import {MarkerTrackApi, MomentMarker, PeriodMarker, VideoSafeZone} from '@byomakase/omakase-player';
import {Subject, filter, take, takeUntil, skip, merge, BehaviorSubject} from 'rxjs';
import {MarkerTrackService, MarkerTrack} from '../../fly-outs/add-markers-fly-out/marker-track.service';
import {PlayerService} from '../../player/player.service';
import {ColorService} from '../../../common/services/color.service';
import tr from 'zod/v4/locales/tr.cjs';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {timecodeValidator} from '../../../common/validators/timecode-validator';
import pl from 'zod/v4/locales/pl.cjs';
import {KnobWrapperComponent} from '../../../common/controls/knob/knob.component';
import {SidecarTextSelectComponent} from '../../../common/controls/text-select/text-select.component';
import {TimecodeDisplay} from '../../../common/timecode-display/timecode-display.component';
import {SidecarAudioSelectComponent} from '../../../common/controls/audio-select/audio-select.component';

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

          } @if (textSelectVisible()) {
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
      <button [disabled]="playControlButtonDisabled()" class="control-button" (click)="togglePlayPause()">@if(playControlState() === 'play'){ Play } @else { Pause }</button>
      <button [disabled]="stepOneFrameForwardsDisabled()" class="control-button long" (click)="stepNFrames(1)">Step 1 frame forwards</button>
      <button [disabled]="stepOneFrameBackwardsDisabled()" class="control-button long" (click)="stepNFrames(-1)">Step 1 frame backwards</button>
      <div class="jump-to-control-wrapper">
        <button [disabled]="jumpDisabled()" class="control-button" (click)="seekToTimecodeControl()">Jump to...</button>
        <input [formControl]="timecodeFormControl" type="text" />
      </div>
      <div class="safezone-wrapper">
        <button [disabled]="safeZoneDisabled()" class="control-button" (click)="toggleSafeZone()">@if(isSafeZoneSet()) {Hide Safezone} @else {Show Safezone}</button>
        <select [formControl]="safeZoneFormControl">
          @for(option of safeZoneOptions; track option.at(0)) {
          <option [value]="option.at(0)">{{ option.at(1) }}</option>
          }
        </select>
      </div>
      <div class="two-column-container">
        <div class="column">
          <select [disabled]="playbackRateDisabled()" [formControl]="playbackRateFormControl">
            @for(playbackRate of playbackRates; track playbackRate) {
            <option [value]="playbackRate">{{ playbackRate }}x</option>
            }
          </select>
          <button [disabled]="textVisibilityButtonDisabled()" class="control-button" (click)="toggleTextVisibility()">@if(textVisibilityState() === 'show'){ Hide Text } @else { Show Text }</button>
          <button class="control-button" [disabled]="muteDisabled()" (click)="toggleMute()">@if(muteState() === 'mute'){Unmute} @else {Mute}</button>
          <button [disabled]="pipDisabled()" (click)="togglePip()" class="control-button">@if(pipState() === 'active') {Deactivate PiP} @else {Activate PiP}</button>
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

  public playbackRateFormControl = new FormControl<PlaybackRate>(1);
  public playbackRates = [0.25, 0.5, 0.75, 1, 2, 4, 8];
  public playbackRateDisabled = signal<boolean>(true);

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

  public safeZoneFormControl = new FormControl<SafeZoneRatio>('action-safe');
  public safeZoneDisabled = signal(true);
  public safeZoneOptions = new Map<SafeZoneRatio, string>([
    ['action-safe', 'Action Safe'],
    ['title-safe', 'Title Safe'],
  ]);
  public isSafeZoneSet = signal(false);

  public fullScreenDisabled = signal(true);

  private playerService = inject(PlayerService);

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  ngAfterViewInit(): void {
    this.volumeFormControl.disable();
  }

  constructor() {
    this.playerService.onCreated$
      .pipe(
        filter((p) => !!p),
        take(1),
        takeUntil(this.destroyed$)
      )
      .subscribe((player) => {
        player.video.onVideoLoaded$.pipe(takeUntil(this.destroyed$)).subscribe((videoLoadedEvent) => {
          if (!videoLoadedEvent) {
            this.playControlButtonDisabled.set(true);
            this.stepOneFrameForwardsDisabled.set(true);
            this.stepOneFrameBackwardsDisabled.set(true);
            this.playbackRateDisabled.set(true);
            this.textVisibilityButtonDisabled.set(true);
            this.muteDisabled.set(true);
            this.pipDisabled.set(true);
            this.volumeFormControl.disable();
            this.safeZoneDisabled.set(true);
            this.fullScreenDisabled.set(true);
          } else {
            this.playControlButtonDisabled.set(false);
            this.stepOneFrameForwardsDisabled.set(false);
            this.playbackRateDisabled.set(false);
            this.playControlState.set('play');
            this.muteDisabled.set(false);
            this.pipDisabled.set(false);
            this.volumeFormControl.enable();
            this.safeZoneDisabled.set(false);
            this.timecodeFormControl.setValue(this.resolveInitialTimecode());
            this.timecode$.next(this.resolveInitialTimecode());
            this.fullScreenDisabled.set(false);

            // track time change event
            player.video.onVideoTimeChange$.pipe(takeUntil(this.destroyed$)).subscribe((videoTimeChangeEvent) => {
              if (videoTimeChangeEvent.frame === 0) {
                this.stepOneFrameBackwardsDisabled.set(true);
              } else {
                this.stepOneFrameBackwardsDisabled.set(false);
              }
              if (videoTimeChangeEvent.frame === videoLoadedEvent.video.totalFrames) {
                this.stepOneFrameForwardsDisabled.set(true);
              } else {
                this.stepOneFrameForwardsDisabled.set(false);
              }
            });

            //track play pause events
            player.video.onPlay$.pipe(takeUntil(this.destroyed$)).subscribe(() => this.handlePlayerPlay());
            player.video.onPause$.pipe(takeUntil(this.destroyed$)).subscribe(() => this.handlePlayerPause());

            //set up correct timecode validator
            this.timecodeFormControl.setValidators([timecodeValidator(videoLoadedEvent.video.frameRate, videoLoadedEvent.video.dropFrame)]);

            this.timecodeFormControl.valueChanges.subscribe(() => this.resolveJumpDisable());

            this.playbackRateFormControl.valueChanges.subscribe((playbackRate) => {
              if (playbackRate) {
                player.video.setPlaybackRate(playbackRate);
              }
            });

            // track subtitle creation and visibility
            player.subtitles.onCreate$.pipe(takeUntil(this.destroyed$)).subscribe(() => {
              this.textVisibilityButtonDisabled.set(false);
              this.resolveTextSelectVisibility();
            });

            player.subtitles.onSubtitlesLoaded$.subscribe(() => {
              this.resolveTextSelectVisibility();
            });

            player.subtitles.onShow$.pipe(takeUntil(this.destroyed$)).subscribe(() => {
              this.textVisibilityState.set('show');
            });

            player.subtitles.onHide$.pipe(takeUntil(this.destroyed$)).subscribe(() => {
              this.textVisibilityState.set('hide');
            });

            // track track selection option
            merge(player.audio.onAudioLoaded$, player.audio.onSidecarAudioLoaded$, player.audio.onSidecarAudioRemove$).subscribe(() => this.resolveAudioSelectVisibility());
            merge(player.subtitles.onCreate$, player.subtitles.onRemove$).subscribe(() => {
              this.resolveTextSelectVisibility();
            });

            //track mute state and volume
            player.audio.onAudioOutputVolumeChange$.subscribe((outputVolumeChangeEvent) => {
              if (outputVolumeChangeEvent.muted) {
                this.muteState.set('mute');
              } else {
                this.muteState.set('unmute');
              }
            });

            //sync slider
            this.volumeFormControl.valueChanges.subscribe((volume) => {
              if (volume === null) {
                return;
              }
              this.playerService.omakasePlayer!.audio.setAudioOutputVolume(volume);
            });

            //sync timecode
            player.video.onVideoTimeChange$.subscribe((videoTimeChangeEvent) => {
              this.timecode$.next(player.video.getCurrentTimecode());
            });

            this.safeZoneFormControl.valueChanges.subscribe((value) => {
              if (this.isSafeZoneSet()) {
                this.toggleSafeZone();
                this.toggleSafeZone();
              }
            });
          }
        });
      });
  }

  private handlePlayerPause() {
    this.playControlState.set('play');
    this.resolveJumpDisable();
  }

  private handlePlayerPlay() {
    this.playControlState.set('pause');
    this.resolveJumpDisable();
  }

  private resolveAudioSelectVisibility() {
    const numberOfEmbeddedAudios = this.playerService.omakasePlayer!.audio.getAudioTracks().length;
    const numberOfSidecarAudios = this.playerService.omakasePlayer!.audio.getSidecarAudioTracks().length;

    const isVisible = numberOfEmbeddedAudios + numberOfSidecarAudios > 1;
    this.audioSelectVisible.set(isVisible);
  }

  private resolveTextSelectVisibility() {
    const isVisible = this.playerService.omakasePlayer!.subtitles.getTracks().length > 1;
    this.textSelectVisible.set(isVisible);
  }

  private resolveJumpDisable() {
    if (this.playerService.omakasePlayer?.video && this.timecodeFormControl.valid) {
      const video = this.playerService.omakasePlayer.video.getVideo()!;
      const isPaused = this.playerService.omakasePlayer.video.isPaused();
      const timecode = this.timecodeFormControl.value!;
      const frame = this.playerService.omakasePlayer!.video.parseTimecodeToFrame(timecode);
      const isFrameValid = frame < video.totalFrames;

      const isDisabled = !isFrameValid || !isPaused;
      this.jumpDisabled.set(isDisabled);
      return;
    }
    this.jumpDisabled.set(true);
  }

  public togglePlayPause() {
    if (this.playerService.omakasePlayer!.video!.isPlaying()) {
      this.playerService.omakasePlayer!.video!.pause();
    } else {
      this.playerService.omakasePlayer!.video!.play();
    }
  }

  public async togglePip() {
    const videoElement = this.playerService.omakasePlayer!.video.getHTMLVideoElement();

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
    const currentFrame = this.playerService.omakasePlayer!.video!.getCurrentFrame();
    const newFrame = Math.min(Math.max(0, currentFrame + numberOfFrames), this.playerService.omakasePlayer!.video.getVideo()!.totalFrames);
    this.playerService.omakasePlayer!.video.pause().subscribe(() => {
      this.playerService.omakasePlayer!.video.seekToFrame(newFrame);
    });
  }

  public seekToTimecodeControl() {
    const timecode = this.timecodeFormControl.value!;
    const frame = this.playerService.omakasePlayer!.video.parseTimecodeToFrame(timecode);
    this.playerService.omakasePlayer!.video!.seekToFrame(frame);
  }

  public toggleTextVisibility() {
    this.playerService.omakasePlayer!.subtitles.toggleShowHideActiveTrack();
  }

  public changeVolume(volume: number) {
    this.playerService.omakasePlayer!.audio.setAudioOutputVolume(volume);
  }

  public toggleMute() {
    this.playerService.omakasePlayer!.audio.toggleAudioOutputMuteUnmute();
  }

  public resolveInitialTimecode() {
    const video = this.playerService.omakasePlayer?.video.getVideo();

    if (!video) {
      return '00:00:00:00';
    }

    if (video.dropFrame) {
      return '00:00:00;00';
    }

    if (video.audioOnly) {
      return '00:00:00.00';
    }

    return '00:00:00:00';
  }

  public toggleSafeZone() {
    if (this.isSafeZoneSet()) {
      this.playerService.omakasePlayer!.video.clearSafeZones();
      this.isSafeZoneSet.set(false);
    } else {
      const ratio = this.safeZoneFormControl.value!;
      this.playerService.omakasePlayer!.video.addSafeZone(this.resolveSafeZone(ratio)).subscribe({
        error: (err) => console.log(err),
      });
      this.isSafeZoneSet.set(true);
    }
  }

  private resolveSafeZone(safeZoneRation: SafeZoneRatio): VideoSafeZone {
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
    this.playerService.omakasePlayer!.video.toggleFullscreen();
  }
}

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

import {AfterViewInit, Component, computed, OnDestroy, output, signal} from '@angular/core';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {EMPTY, filter, Subject, switchMap} from 'rxjs';
import {PlayerService} from '../../../components/player/player.service';
import {SidecarAudioService} from '../../../components/fly-outs/add-sidecar-audio-fly-out/sidecar-audio-service/sidecar-audio.service';
import {StringUtil} from '../../util/string-util';
import {Audio, FileFormatType, PlayerAudioEventType, PlayerAudioType} from '@byomakase/omakase-player';
import {SidecarAudio} from '../../../components/fly-outs/add-sidecar-audio-fly-out/sidecar-audio-service/sidecar-audio.service.abstract';

/**
 * Selection component that allows for changing currently selected audio in single audio mode.
 * It handles audio change and its logic is self contained.
 */
@Component({
  selector: 'app-audio-select',
  imports: [ReactiveFormsModule],
  template: `
    <select [formControl]="selectControl">
      @if (isAudioLoaded()) {
        @for (track of audioTracks(); track track) {
          <option [value]="track.id">{{ resolveTrackDisplayName(track) }}</option>
        }
      }
    </select>
  `,
})
export class SidecarAudioSelectComponent implements AfterViewInit, OnDestroy {
  sidecarSelect = output<string>();
  selectControl = new FormControl();

  private readonly mainAudioTracks = signal<Audio[]>([]);

  isAudioLoaded = signal(false);
  private destroyed$ = new Subject<void>();

  readonly audioTracks = computed(() => {
    return [...this.mainAudioTracks(), ...this.sidecarAudioService.loadedSidecarAudios()];
  });

  constructor(
    private playerService: PlayerService,
    private sidecarAudioService: SidecarAudioService
  ) {}

  ngAfterViewInit(): void {
    this.selectControl.valueChanges.subscribe((id) => {
      // this.sidecarAudioService.deactivateAllSidecarAudios();
      this.playerService.omakasePlayer?.player.audio.switchTrack(id);
    });

    // this.sidecarAudioService.onSelectedAudioTrackChange$.pipe(takeUntil(this.destroyed$)).subscribe((activeTrack) => {
    //   this.selectControl.setValue(activeTrack.id);
    // });

    this.playerService
      .observeMediaLoads(this.destroyed$)
      .pipe(
        switchMap((omakasePlayer) => {
          if (!omakasePlayer) {
            return EMPTY;
          }
          this.mainAudioTracks.set(omakasePlayer.player.audio.state.tracks[PlayerAudioType.MAIN].map((playerAudio) => omakasePlayer.track.get(playerAudio.trackId)! as Audio));
          this.isAudioLoaded.set(true);

          this.selectControl.setValue(
            [...omakasePlayer.player.audio.state.tracks[PlayerAudioType.MAIN], ...omakasePlayer.player.audio.state.tracks[PlayerAudioType.SIDECAR]].find((playerAudio) => playerAudio.active)!.trackId,
            {emitEvent: false}
          );

          return omakasePlayer.player.audio.onEvent$.pipe(filter((event) => event.type === PlayerAudioEventType.PLAYER_AUDIO_TRACK_SWITCHED));
        })
      )
      .subscribe((audioTrackSwitchedEvent) => {
        this.selectControl.setValue(audioTrackSwitchedEvent.data.playerAudioTrack.trackId, {emitEvent: false});
      });
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  /**
   *
   * @param track
   * @returns - Audio label used for audio track identification
   */
  resolveTrackDisplayName(track: Audio | SidecarAudio) {
    const omakasePlayer = this.playerService.omakasePlayer;

    if (!omakasePlayer) {
      return;
    }

    if (!omakasePlayer.player.mainMedia) {
      return;
    }

    const isEmbedded = omakasePlayer.player.audio.state.tracks[PlayerAudioType.MAIN].find((playerAudio) => playerAudio.trackId === track.id);

    if (!isEmbedded) {
      if (track.label) {
        return track.label;
      } else if ('src' in track) {
        return StringUtil.leafUrlToken(track.src);
      }
    }

    // if ('state' in track && track.sourceFileFormatType === FileFormatType.HLS) {
    //   return track.language.toUpperCase();
    // }

    if (track.label) {
      return StringUtil.toMixedCase(track.label);
    }

    return 'Main Audio';
  }
}

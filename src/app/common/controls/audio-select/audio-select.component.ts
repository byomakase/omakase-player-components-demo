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
import {OmpAudioTrack} from '@byomakase/omakase-player';
import {Subject, takeUntil} from 'rxjs';
import {PlayerService} from '../../../components/player/player.service';
import {SidecarAudioService} from '../../../components/fly-outs/add-sidecar-audio-fly-out/sidecar-audio-service/sidecar-audio.service';
import {StringUtil} from '../../util/string-util';

/**
 * Selection component that allows for changing currently selected audio in single audio mode.
 * It handles audio change and its logic is self contained.
 */
@Component({
  selector: 'app-audio-select',
  imports: [ReactiveFormsModule],
  template: `
    <select [formControl]="selectControl">
      @if (isAudioLoaded()) { @for(track of audioTracks(); track track) {
      <option [value]="track.id">{{ resolveTrackDisplayName(track) }}</option>
      } }
    </select>
  `,
})
export class SidecarAudioSelectComponent implements AfterViewInit, OnDestroy {
  sidecarSelect = output<OmpAudioTrack>();
  selectControl = new FormControl();

  private readonly mainAudioTracks = signal<OmpAudioTrack[]>([]);

  isAudioLoaded = signal(false);
  private destroyed$ = new Subject<void>();

  readonly audioTracks = computed<OmpAudioTrack[]>(() => {
    return [...this.mainAudioTracks(), ...this.sidecarAudioService.loadedSidecarAudios()];
  });

  constructor(private playerService: PlayerService, private sidecarAudioService: SidecarAudioService) {}

  ngAfterViewInit(): void {
    this.selectControl.valueChanges.subscribe((id) => {
      if (
        this.mainAudioTracks()
          .map((track) => track.id)
          .includes(id)
      ) {
        this.sidecarAudioService.deactivateAllSidecarAudios();
        this.playerService.omakasePlayer?.audio.setActiveAudioTrack(id);
        this.playerService.omakasePlayer?.video.unmute();
      } else {
        this.playerService.omakasePlayer?.video.mute();
        this.playerService.omakasePlayer?.audio.activateSidecarAudioTracks([id], true);
      }
    });

    this.sidecarAudioService.onSelectedAudioTrackChange$.pipe(takeUntil(this.destroyed$)).subscribe((activeTrack) => {
      this.selectControl.setValue(activeTrack.id);
    });

    this.playerService.onCreated$.pipe(takeUntil(this.destroyed$)).subscribe((player) => {
      if (player) {
        player.audio.onAudioLoaded$.subscribe((audioLoadedEvent) => {
          if (!audioLoadedEvent) {
            return;
          }
          this.mainAudioTracks.set(player.audio.getAudioTracks());
          this.isAudioLoaded.set(true);

          // resolve initial value if the player was set up before select component
          const activeSidecarTracks = player.audio.getActiveSidecarAudioTracks();

          if (activeSidecarTracks.length) {
            this.selectControl.setValue(activeSidecarTracks.at(0)!.id);
          } else {
            this.selectControl.setValue(player.audio.getActiveAudioTrack()?.id);
          }
        });
      }
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
  resolveTrackDisplayName(track: OmpAudioTrack) {
    const player = this.playerService.omakasePlayer;

    if (!player) {
      return;
    }

    if (!player.video.getVideo()) {
      return;
    }

    if (!track.embedded) {
      if (track.label) {
        return track.label;
      } else {
        return StringUtil.leafUrlToken(track.src);
      }
    }

    if (track.language) {
      return track.language.toUpperCase();
    }

    if (track.label) {
      return StringUtil.toMixedCase(track.label);
    }

    return 'Main Audio';
  }

  /**
   *
   * @returns list of playable audio tracks
   */
  getTracks() {
    const mainTracks = this.playerService.omakasePlayer?.audio.getAudioTracks() ?? [];
    const sidecarTracks = this.playerService.omakasePlayer?.audio.getSidecarAudioTracks() ?? [];
    return [...mainTracks, ...sidecarTracks];
  }
}

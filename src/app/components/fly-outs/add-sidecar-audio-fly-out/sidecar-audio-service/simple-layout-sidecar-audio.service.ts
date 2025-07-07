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
import {OmakasePlayer, OmpAudioTrack} from '@byomakase/omakase-player';
import {Subject} from 'rxjs';
import {PlayerService} from '../../../player/player.service';
import {ToastService} from '../../../../common/toast/toast.service';
import {StringUtil} from '../../../../common/util/string-util';

export type SidecarAudio = Partial<OmpAudioTrack> & {src: string};

/**
 * Specific sidecar audio service. MUST NOT be injected anywhere but sidecar audio service.
 */
@Injectable({
  providedIn: 'root',
})
export class SimpleLayoutSidecarAudioService {
  private playerService = inject(PlayerService);
  private toastService = inject(ToastService);
  constructor() {
    this.playerService.onCreated$.subscribe({
      next: (player: OmakasePlayer | undefined) => {
        this.loadedSidecarAudios.set([]);
        if (player) {
          player.audio.onAudioSwitched$.subscribe((audioSwitchedEvent) => {
            this.onSelectedAudioTrackChange$.next(audioSwitchedEvent.activeAudioTrack);
          });

          player.video.onVolumeChange$.subscribe((videoVolumeEvent) => {
            if (!videoVolumeEvent.muted) {
              this.onSelectedAudioTrackChange$.next(player.audio.getActiveAudioTrack()!);
            }
          });

          player.audio.onSidecarAudioChange$.subscribe((sidecarAudioChangeEvent) => {
            const activeSidecarTracks = player.audio.getActiveSidecarAudioTracks();
            if (activeSidecarTracks.length) {
              this.onSelectedAudioTrackChange$.next(activeSidecarTracks.at(0)!);
            }
          });

          player.audio.onSidecarAudioCreate$.subscribe((sidecarAudioCreateEvent) =>
            this.loadedSidecarAudios.update((previous) => [...previous, sidecarAudioCreateEvent.createdSidecarAudioState.audioTrack])
          );

          player.audio.onSidecarAudioRemove$.subscribe((sidecarAudioRemoveEvent) =>
            this.loadedSidecarAudios.update((previous) => previous.filter((track) => track !== sidecarAudioRemoveEvent.removedSidecarAudio.audioTrack))
          );
        } else {
          this.loadedSidecarAudios.update(() => []);
          this._pendingSidecarAudios.update(() => []);
          this.noUserLabelSidecarAudioIds.update(() => []);
        }
      },
    });
  }

  public onSelectedAudioTrackChange$: Subject<OmpAudioTrack> = new Subject();
  public loadedSidecarAudios = signal<OmpAudioTrack[]>([]); // sidecar audios registered with omakase player
  private _pendingSidecarAudios = signal<SidecarAudio[]>([]); // sidecar audios in process of registration with omakase player

  public noUserLabelSidecarAudioIds = signal<string[]>([]); // sidecar audio ids for which the user did not provide labels

  public sidecarAudios = computed(() => {
    return [...this.loadedSidecarAudios(), ...this._pendingSidecarAudios()];
  });

  public addSidecarAudio(sidecarAudio: SidecarAudio) {
    this._pendingSidecarAudios.update((prev) => [...prev, sidecarAudio]);
    let label;
    if (sidecarAudio.label === '') {
      label = StringUtil.leafUrlToken(sidecarAudio.src);
    } else {
      label = sidecarAudio.label;
    }

    this.playerService
      .omakasePlayer!.audio.createSidecarAudioTrack({
        src: sidecarAudio.src,
        label: label!,
      })
      .subscribe({
        next: (audioTrack: OmpAudioTrack) => {
          this.playerService.omakasePlayer!.video.mute();
          this.playerService.omakasePlayer!.audio.activateSidecarAudioTracks([audioTrack.id], true);
          this._pendingSidecarAudios.update((prev) => prev.filter((psa) => psa !== sidecarAudio));
          if (sidecarAudio.label === '') {
            this.noUserLabelSidecarAudioIds.update((prev) => [...prev, audioTrack.id]);
          }
          sidecarAudio.id = audioTrack.id;
          this.toastService.show({message: 'Sidecar successfully loaded', type: 'success', duration: 5000});
        },
        error: () => {
          this.removeSidecarAudio(sidecarAudio);
          this.toastService.show({message: 'Sidecar load failed', type: 'error', duration: 5000});
        },
      });
  }

  public removeSidecarAudio(sidecarAudio: SidecarAudio) {
    if (sidecarAudio.id) {
      this.playerService.omakasePlayer!.audio.removeSidecarAudioTracks([sidecarAudio.id]);

      const activeSidecarTracks = this.playerService.omakasePlayer!.audio.getActiveSidecarAudioTracks();
      const loadedSidecarAudios = this.playerService.omakasePlayer!.audio.getSidecarAudioTracks();

      if (activeSidecarTracks.length === 0) {
        if (loadedSidecarAudios.length > 0) {
          this.playerService.omakasePlayer!.audio.activateSidecarAudioTracks([loadedSidecarAudios.at(-1)!.id], true);
        } else {
          this.playerService.omakasePlayer!.video.unmute();
        }
      }
    }

    this._pendingSidecarAudios.update((prev) => prev.filter((sidecar) => sidecar !== sidecarAudio));
  }

  public reloadSidecarAudios(sidecarAudios: SidecarAudio[]) {
    sidecarAudios
      .filter((sidecarAudio) => sidecarAudio.id)
      .forEach((sidecarAudio) => {
        this.playerService.omakasePlayer!.audio.createSidecarAudioTrack({src: sidecarAudio.src, label: sidecarAudio.label!}).subscribe((track) => (sidecarAudio.id = track.id));
      });
  }

  public removeAllSidecarAudios() {
    this.playerService.omakasePlayer!.audio.removeAllSidecarAudioTracks();
  }

  public activateSidecarAudio(sidecarAudio: SidecarAudio, muteOthers: boolean = true) {
    if (sidecarAudio.id) {
      this.playerService.omakasePlayer!.audio.activateSidecarAudioTracks([sidecarAudio.id], muteOthers);
    } else {
      console.error('Sidecar audio is not loaded');
    }
  }

  public deactivateAllSidecarAudios() {
    this.playerService.omakasePlayer!.audio.deactivateSidecarAudioTracks(undefined);
  }
}

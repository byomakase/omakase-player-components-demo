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
import {OmpAudioTrack} from '@byomakase/omakase-player';
import {filter, Subject, take, takeUntil} from 'rxjs';
import {ToastService} from '../../../../common/toast/toast.service';
import {StringUtil} from '../../../../common/util/string-util';
import {StampLayoutService} from '../../../layouts/stamp-layout/stamp-layout.service';
import {PlayerChromingTheme} from '@byomakase/omakase-player';

export type SidecarAudio = Partial<OmpAudioTrack> & {src: string};

/**
 * Specific sidecar audio service. MUST NOT be injected anywhere but sidecar audio service.
 */
@Injectable({
  providedIn: 'root',
})
export class StampLayoutSidecarAudioService {
  private toastService = inject(ToastService);
  private stampLayoutService = inject(StampLayoutService);
  constructor() {
    //@ts-ignore
    window.sas = this;
  }

  public onSelectedAudioTrackChange$: Subject<OmpAudioTrack> = new Subject();
  public loadedSidecarAudios = signal<OmpAudioTrack[]>([]); // sidecar audios registered with omakase player
  private _pendingSidecarAudios = signal<SidecarAudio[]>([]); // sidecar audios in process of registration with omakase player

  public noUserLabelSidecarAudioIds = signal<string[]>([]); // sidecar audio ids for which the user did not provide labels

  public sidecarAudios = computed(() => {
    return [...this.loadedSidecarAudios(), ...this._pendingSidecarAudios()];
  });

  private playersIdBySidecarId = new Map<string, string>();
  private playersIdByPendingSidecarId = new Map<string, string>();

  /**
   * Loads and activates a sidecar audio. Already active side car audios will deactivate.
   * If label is not present in the sidecar, filename from url will be used in omakase player internally.
   *
   * @param {SidecarAudio} sidecarAudio
   */
  public addSidecarAudio(sidecarAudio: SidecarAudio, showSuccessToast: boolean = true) {
    const result$ = new Subject<boolean>();
    this._pendingSidecarAudios.update((prev) => [...prev, sidecarAudio]);
    let label;
    if (sidecarAudio.label === '') {
      label = StringUtil.leafUrlToken(sidecarAudio.src);
    } else {
      label = sidecarAudio.label;
    }

    const id = crypto.randomUUID();

    const watermark = `Main Media + ${label}`;

    this.stampLayoutService
      .createStampPlayer({
        loadVideoIfPresent: true,
        isMainPlayer: false,
        playerChroming: {
          theme: PlayerChromingTheme.Default,
          watermark: watermark,
        },
      })
      .subscribe((playerId) => {
        const player = this.stampLayoutService.getPlayer(playerId)!;
        player.audio
          .createSidecarAudioTrack({
            src: sidecarAudio.src,
            label: label!,
            id: id,
          })
          .pipe(takeUntil(this.stampLayoutService.onReset$))
          .subscribe({
            next: (audioTrack: OmpAudioTrack) => {
              player.video.mute();
              player.audio.activateSidecarAudioTracks([audioTrack.id], true);
              player.video.pause();
              this._pendingSidecarAudios.update((prev) => prev.filter((psa) => psa !== sidecarAudio));

              this.loadedSidecarAudios.update((prev) => [...prev, audioTrack]);

              if (sidecarAudio.label === '') {
                this.noUserLabelSidecarAudioIds.update((prev) => [...prev, audioTrack.id]);
              }
              sidecarAudio.id = audioTrack.id;
              if (showSuccessToast) {
                this.toastService.show({message: 'Sidecar successfully loaded', type: 'success', duration: 5000});
              }

              this.playersIdBySidecarId.set(id, playerId);

              result$.next(true);
              result$.complete();
            },
            error: () => {
              this.removeSidecarAudio(sidecarAudio);
              if (!sidecarAudio.id) {
                this.stampLayoutService.destroyStampPlayer(playerId);
              }
              this.toastService.show({message: 'Sidecar load failed', type: 'error', duration: 5000});
              result$.next(false);
              result$.complete();
            },
          });
      });

    return result$;
  }

  /**
   * Deletes the sidecar audio from OPCD session
   *
   * @param {SidecarAudio} sidecarAudio
   */
  public removeSidecarAudio(sidecarAudio: SidecarAudio) {
    if (sidecarAudio.id) {
      this.removeSidecarAudioInertial(sidecarAudio.id);
    }

    this._pendingSidecarAudios.update((prev) => prev.filter((sidecar) => sidecar !== sidecarAudio));
  }

  private removeSidecarAudioInertial(sidecarAudioId: string) {
    const playerId = this.playersIdBySidecarId.get(sidecarAudioId)!;
    this.playersIdBySidecarId.delete(sidecarAudioId);

    this.stampLayoutService.destroyStampPlayer(playerId);
    this.loadedSidecarAudios.update((prev) => prev.filter((loadedSidecarAudio) => loadedSidecarAudio.id !== sidecarAudioId));
  }

  /**
   * Reloads sidecar audios. This method is usually called after the player has been destroyed, the arguments should
   * capture the player state before destruction
   *
   * @param {SidecarAudio[]} sidecarAudios - Sidecar audios
   * @param {OmpAudioTrack[]} sidecarAudioTracks - Sidecar tracks registered with Omakase player
   */
  public reloadSidecarAudios(sidecarAudios: SidecarAudio[], sidecarAudioTracks: OmpAudioTrack[]) {
    this.loadedSidecarAudios().forEach((track) => {
      const playerId = this.playersIdBySidecarId.get(track.id!)!;
      const player = this.stampLayoutService.getPlayer(playerId)!;
      player.audio.onAudioLoaded$
        .pipe(
          filter((p) => !!p),
          take(1)
        )
        .subscribe(() => {
          player.audio
            .createSidecarAudioTrack({
              src: track.src,
              label: track.label,
              id: track.id,
            })
            .subscribe(() => {
              player.video.mute();
              player.audio.activateSidecarAudioTracks([track.id], true);
            });
        });
    });
  }

  /**
   * Removes all sidecar audios from OPCD session
   */
  public removeAllSidecarAudios() {
    // [...this.playersIdBySidecarId.values()].forEach((playerId) => this.stampLayoutService.destroyStampPlayer(playerId));
    this.reset();
  }

  /**
   * Activates a sidecar audio
   *
   * @param {SidecarAudio} sidecarAudio - sidecar audio to activate
   * @param {boolean} deactivateOthers - should other sidecars be deactivated
   */
  public activateSidecarAudio(sidecarAudio: SidecarAudio, deactivateOthers: boolean = true) {
    if (sidecarAudio.id) {
      const playerId = this.playersIdBySidecarId.get(sidecarAudio.id)!;
      const player = this.stampLayoutService.getPlayer(playerId)!;

      player.audio.activateSidecarAudioTracks([sidecarAudio.id], deactivateOthers);
    } else {
      console.error('Sidecar audio is not loaded');
    }
  }

  /**
   * Deactivates all sidecar audios
   */
  public deactivateAllSidecarAudios() {
    [...this.playersIdBySidecarId.values()].forEach((playerId) => {
      const player = this.stampLayoutService.getPlayer(playerId)!;
      player.audio.deactivateSidecarAudioTracks(undefined);
    });
  }

  public reset() {
    [...this.playersIdBySidecarId.values()].forEach((playerId) => this.stampLayoutService.destroyStampPlayer(playerId));
    this.loadedSidecarAudios.set([]);
    this._pendingSidecarAudios.set([]);
    this.noUserLabelSidecarAudioIds.set([]);
    this.playersIdBySidecarId = new Map<string, string>();
  }
}

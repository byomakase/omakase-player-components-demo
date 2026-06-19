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
import {Subject, takeUntil} from 'rxjs';
import {ToastService} from '../../../../common/toast/toast.service';
import {StringUtil} from '../../../../common/util/string-util';
import {StampLayoutService} from '../../../layouts/stamp-layout/stamp-layout.service';
import {ChromingTheme, Track, TrackType} from '@byomakase/omakase-player';
import {AbstractSidecarAudioService, SidecarAudio} from './sidecar-audio.service.abstract';

/**
 * Specific sidecar audio service. MUST NOT be injected anywhere but sidecar audio service.
 */
@Injectable({
  providedIn: 'root',
})
export class StampLayoutSidecarAudioService implements AbstractSidecarAudioService {
  private toastService = inject(ToastService);
  private stampLayoutService = inject(StampLayoutService);
  constructor() {
    //@ts-ignore
    window.sas = this;
  }

  public loadedSidecarAudios = signal<SidecarAudio[]>([]); // sidecar audios registered with omakase player
  private _pendingSidecarAudios = signal<SidecarAudio[]>([]); // sidecar audios in process of registration with omakase player

  public noUserLabelSidecarAudioIds = signal<string[]>([]); // sidecar audio ids for which the user did not provide labels

  public sidecarAudios = computed(() => {
    return [...this.loadedSidecarAudios(), ...this._pendingSidecarAudios()];
  });

  private playersIdBySidecarId = new Map<string, string>();

  /**
   * Loads and activates a sidecar audio in a freshly spawned stamp player.
   * If label is not present in the sidecar, filename from url is used.
   *
   * @param {SidecarAudio} sidecarAudio
   */
  public addSidecarAudio(sidecarAudio: SidecarAudio, showSuccessToast: boolean = true) {
    const result$ = new Subject<boolean>();
    this._pendingSidecarAudios.update((prev) => [...prev, sidecarAudio]);
    const label = sidecarAudio.label === '' || sidecarAudio.label === undefined ? StringUtil.leafUrlToken(sidecarAudio.src) : sidecarAudio.label;

    const watermark = `Main Media + ${label}`;

    this.stampLayoutService
      .createStampPlayer({
        loadVideoIfPresent: true,
        isMainPlayer: false,
        chromingTheme: ChromingTheme.STAMP,
        chromingWatermark: watermark,
      })
      .subscribe((playerId) => {
        const player = this.stampLayoutService.getPlayer(playerId)!;
        player.player
          .loadSidecarTrack(sidecarAudio.src, {
            trackType: TrackType.AUDIO,
            args: {label: sidecarAudio.label !== '' ? sidecarAudio.label : undefined},
          })
          .pipe(takeUntil(this.stampLayoutService.onReset$))
          .subscribe({
            next: (audioTrack: Track) => {
              player.player.audio.mute();
              player.player.audio.switchTrack(audioTrack.id, true);
              player.player.pause();
              this._pendingSidecarAudios.update((prev) => prev.filter((psa) => psa !== sidecarAudio));

              this.loadedSidecarAudios.update((prev) => [...prev, {src: sidecarAudio.src, label, id: audioTrack.id}]);

              if (sidecarAudio.label === '') {
                this.noUserLabelSidecarAudioIds.update((prev) => [...prev, audioTrack.id]);
              }
              sidecarAudio.id = audioTrack.id;
              if (showSuccessToast) {
                this.toastService.show({message: 'Sidecar successfully loaded', type: 'success', duration: 5000});
              }

              this.playersIdBySidecarId.set(audioTrack.id, playerId);

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
      const playerId = this.playersIdBySidecarId.get(sidecarAudio.id);
      this.playersIdBySidecarId.delete(sidecarAudio.id);
      if (playerId) {
        this.stampLayoutService.destroyStampPlayer(playerId);
      }
      this.loadedSidecarAudios.update((prev) => prev.filter((track) => track.id !== sidecarAudio.id));
    }

    this._pendingSidecarAudios.update((prev) => prev.filter((sidecar) => sidecar !== sidecarAudio));
  }

  public reset() {
    [...this.playersIdBySidecarId.values()].forEach((playerId) => this.stampLayoutService.destroyStampPlayer(playerId));
    this.loadedSidecarAudios.set([]);
    this._pendingSidecarAudios.set([]);
    this.noUserLabelSidecarAudioIds.set([]);
    this.playersIdBySidecarId = new Map<string, string>();
  }
}

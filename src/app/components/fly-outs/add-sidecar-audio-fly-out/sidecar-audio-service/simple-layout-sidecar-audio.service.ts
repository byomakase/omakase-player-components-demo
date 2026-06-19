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
import {filter, Subject} from 'rxjs';
import {PlayerService} from '../../../player/player.service';
import {ToastService} from '../../../../common/toast/toast.service';
import {StringUtil} from '../../../../common/util/string-util';
import {
  AudioFile,
  OmakasePlayer,
  PlayerAudioEventType,
  PlayerSidecarAudioTrack,
  PlayerAudioTrackState,
  PlayerAudioType,
  Track,
  TrackState,
  TrackType,
  UrlSource,
  PlayerEventType,
} from '@byomakase/omakase-player';
import {AbstractSidecarAudioService, SidecarAudio} from './sidecar-audio.service.abstract';
import {tr} from 'zod/v4/locales';

/**
 * Specific sidecar audio service. MUST NOT be injected anywhere but sidecar audio service.
 */
@Injectable({
  providedIn: 'root',
})
export class SimpleLayoutSidecarAudioService implements AbstractSidecarAudioService {
  private playerService = inject(PlayerService);
  private toastService = inject(ToastService);
  constructor() {
    this.playerService.onCreated$.subscribe({
      next: (omakasePlayer: OmakasePlayer | undefined) => {
        this.loadedSidecarAudios.set([]);
        if (omakasePlayer) {
          omakasePlayer.player.audio.onEvent$.subscribe((playerAudioEvent) => {
            if (playerAudioEvent.type === PlayerAudioEventType.PLAYER_AUDIO_TRACK_SWITCHED) {
              const isMainMediaEnabled = omakasePlayer.player.audio.getHandler(PlayerAudioType.MAIN)!.enabled;

              const activeTrack = playerAudioEvent.data.playerAudio.tracks[isMainMediaEnabled ? 'MAIN' : 'SIDECAR'].find((track) => track.active)!;
              this.onSelectedAudioTrackChange$.next(activeTrack);
            } else if (playerAudioEvent.type === PlayerAudioEventType.PLAYER_AUDIO_CHANGE) {
              //pass for now
            } else if (playerAudioEvent.type === PlayerAudioEventType.PLAYER_AUDIO_TRACK_LOADED) {
              const track = omakasePlayer.player.audio.getTracks().find((track) => track.id === playerAudioEvent.data.playerAudioTrack.trackId)!;
              const sidecarAudio: SidecarAudio = {
                src: (track.source as UrlSource).url,
                id: track.id,
                label: track.state.label,
              };
              this.loadedSidecarAudios.update((previous) => [...previous, sidecarAudio]);
            }
          });

          // omakasePlayer.player.onEvent$.pipe(filter((event) => event.type === PlayerEventType.PLAYER_MAIN_MEDIA_UNLOADING)).subscribe(() => this.reset());
          // omakasePlayer.player.audio.onEvent$.onAudioSwitched$.subscribe((audioSwitchedEvent) => {
          //   this.onSelectedAudioTrackChange$.next(audioSwitchedEvent.activeAudioTrack);
          // });
          // player.audio.onAudioLoaded$.subscribe((audioLoadedEvent) => {
          //   if (audioLoadedEvent?.activeAudioTrack) {
          //     this.onSelectedAudioTrackChange$.next(audioLoadedEvent?.activeAudioTrack);
          //   }
          // });
          // omakasePlayer.video.onVolumeChange$.subscribe((videoVolumeEvent) => {
          //   if (!videoVolumeEvent.muted) {
          //     this.onSelectedAudioTrackChange$.next(omakasePlayer.audio.getActiveAudioTrack()!);
          //   }
          // });
          // omakasePlayer.audio.onSidecarAudioChange$.subscribe((sidecarAudioChangeEvent) => {
          //   const activeSidecarTracks = omakasePlayer.audio.getActiveSidecarAudioTracks();
          //   if (activeSidecarTracks.length) {
          //     this.onSelectedAudioTrackChange$.next(activeSidecarTracks.at(0)!);
          //   }
          // });
          // omakasePlayer.audio.onSidecarAudioLoaded$.subscribe((sidecarAudioLoadedEvent) =>
          //   this.loadedSidecarAudios.update((previous) => [...previous, sidecarAudioLoadedEvent.sidecarAudioState.audioTrack])
          // );
          // omakasePlayer.audio.onSidecarAudioRemove$.subscribe((sidecarAudioRemoveEvent) =>
          //   this.loadedSidecarAudios.update((previous) => previous.filter((track) => track !== sidecarAudioRemoveEvent.sidecarAudioState.audioTrack))
          // );
        } else {
          this.reset();
        }
      },
    });
  }
  public onSelectedAudioTrackChange$: Subject<PlayerAudioTrackState> = new Subject();
  public loadedSidecarAudios = signal<SidecarAudio[]>([]); // sidecar audios registered with omakase player
  private _pendingSidecarAudios = signal<SidecarAudio[]>([]); // sidecar audios in process of registration with omakase player
  public noUserLabelSidecarAudioIds = signal<string[]>([]); // sidecar audio ids for which the user did not provide labels
  public sidecarAudios = computed(() => {
    return [...this.loadedSidecarAudios(), ...this._pendingSidecarAudios()];
  });
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
    this.playerService
      //FIXME: @Mislav - add "audio source" to load options which I have removed to make it build
      .omakasePlayer!.player.loadSidecarTrack(sidecarAudio.src, {
        trackType: TrackType.AUDIO,
        args: {
          label: sidecarAudio.label !== '' ? sidecarAudio.label : undefined,
        },
      })
      .subscribe({
        next: (audioTrack: Track) => {
          this.playerService.omakasePlayer!.player.audio.switchTrack(audioTrack.id, true);
          this._pendingSidecarAudios.update((prev) => prev.filter((psa) => psa !== sidecarAudio));
          if (sidecarAudio.label === '') {
            this.noUserLabelSidecarAudioIds.update((prev) => [...prev, audioTrack.id]);
          }
          sidecarAudio.id = audioTrack.id;
          if (showSuccessToast) {
            this.toastService.show({message: 'Sidecar successfully loaded', type: 'success', duration: 5000});
          }
          result$.next(true);
          result$.complete();
        },
        error: (e) => {
          // this.removeSidecarAudio(sidecarAudio);
          this.toastService.show({message: 'Sidecar load failed', type: 'error', duration: 5000});
          console.error(e);
          result$.next(false);
          result$.complete();
        },
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
      this.loadedSidecarAudios.update((prev) => prev.filter((track) => track.id !== sidecarAudio.id));
      this.playerService.omakasePlayer!.player.removeSidecarTrack(sidecarAudio.id);
      const activeSidecarTracks = this.playerService.omakasePlayer!.player.audio.state.tracks['SIDECAR'].filter((track) => track.active);
      const loadedSidecarAudios = this.playerService.omakasePlayer!.player.audio.state.tracks['SIDECAR'];
      if (activeSidecarTracks.length === 0) {
        if (loadedSidecarAudios.length > 0) {
          this.playerService.omakasePlayer!.player.audio.switchTrack(loadedSidecarAudios.at(-1)!.trackId, true);
        } else {
          const mainAudioTrack = this.playerService.omakasePlayer!.player.audio.state.tracks['MAIN'].at(-1);
          this.playerService.omakasePlayer!.player.audio.switchTrack(mainAudioTrack!.trackId, true);
        }
      }
    }
    this._pendingSidecarAudios.update((prev) => prev.filter((sidecar) => sidecar !== sidecarAudio));
  }
  // /**
  //  * Reloads sidecar audios. This method is usually called after the player has been destroyed, the arguments should
  //  * capture the player state before destruction
  //  *
  //  * @param {SidecarAudio[]} sidecarAudios - Sidecar audios
  //  * @param {OmpAudioTrack[]} sidecarAudioTracks - Sidecar tracks registered with Omakase player
  //  */
  // public reloadSidecarAudios(sidecarAudios: SidecarAudio[]) {
  //   sidecarAudios
  //     .filter((sidecarAudio) => sidecarAudio.id)
  //     .forEach((sidecarAudio) => {
  //       this.playerService.omakasePlayer!.audio.createSidecarAudioTrack({src: sidecarAudio.src, label: sidecarAudio.label!}).subscribe((track) => (sidecarAudio.id = track.id));
  //     });
  // }
  // /**
  //  * Removes all sidecar audios from OPCD session
  //  */
  // public removeAllSidecarAudios() {
  //   this.playerService.omakasePlayer!.audio.removeAllSidecarAudioTracks();
  // }
  // /**
  //  * Activates a sidecar audio
  //  *
  //  * @param {SidecarAudio} sidecarAudio - sidecar audio to activate
  //  * @param {boolean} deactivateOthers - should other sidecars be deactivated
  //  */
  // public activateSidecarAudio(sidecarAudio: SidecarAudio, deactivateOthers: boolean = true) {
  //   if (sidecarAudio.id) {
  //     this.playerService.omakasePlayer!.audio.activateSidecarAudioTracks([sidecarAudio.id], deactivateOthers);
  //   } else {
  //     console.error('Sidecar audio is not loaded');
  //   }
  // }
  // /**
  //  * Deactivates all sidecar audios
  //  */
  // public deactivateAllSidecarAudios() {
  //   this.playerService.omakasePlayer!.audio.deactivateSidecarAudioTracks(undefined);
  // }
  public reset() {
    this.loadedSidecarAudios.set([]);
    this._pendingSidecarAudios.set([]);
    this.noUserLabelSidecarAudioIds.set([]);
  }
}

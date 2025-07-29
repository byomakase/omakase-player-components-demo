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
import {PlayerService} from '../../player/player.service';
import {ToastService} from '../../../common/toast/toast.service';
import {SubtitlesVttTrack} from '@byomakase/omakase-player';
import {StringUtil} from '../../../common/util/string-util';
import {Subject} from 'rxjs';

export type SidecarText = Partial<SubtitlesVttTrack> & {src: string};
export type LoadedSidecarText = SidecarText & {id: string};

@Injectable({
  providedIn: 'root',
})
export class SidecarTextService {
  private playerService = inject(PlayerService);
  private toastService = inject(ToastService);
  constructor() {
    this.playerService.onCreated$.subscribe((player) => {
      if (!player) {
        this.loadedSidecarTexts.update(() => []);
        this._pendingSidecarTexts.update(() => []);
        this.noUserLabelSidecarTextIds.update(() => []);
      }
    });
  }

  /**
   * Sidecar texts that have been successfully loaded into Omakase player
   */
  public loadedSidecarTexts = signal<LoadedSidecarText[]>([]);
  /**
   * Sidcar texts that are being loaded into Omakase player
   */
  private _pendingSidecarTexts = signal<SidecarText[]>([]);

  /**
   * sidecar text ids for which the user did not provide label
   */
  public noUserLabelSidecarTextIds = signal<string[]>([]);

  /**
   * All sidecar texts in the OPCD session
   */
  public sidecarTexts = computed(() => {
    return [...this.loadedSidecarTexts(), ...this._pendingSidecarTexts()];
  });

  /**
   * Registers a sidecar text with OPCD session
   *
   * @param {SidecarText} sidecarText
   */
  public addSidecarText(sidecarText: SidecarText, showSuccessToast: boolean = true) {
    const result$ = new Subject<boolean>();
    this._pendingSidecarTexts.update((prev) => [...prev, sidecarText]);

    let label;

    if (sidecarText.label === '') {
      label = StringUtil.leafUrlToken(sidecarText.src);
    } else {
      label = sidecarText.label!;
    }

    this.playerService
      .omakasePlayer!.subtitles.createVttTrack({
        src: sidecarText.src,
        id: sidecarText.id ?? crypto.randomUUID(),
        default: false,
        label: label,
        language: '',
      })
      .subscribe({
        next: (track) => {
          if (track) {
            this.playerService.omakasePlayer!.subtitles.showTrack(track.id);

            sidecarText.id = track.id;

            this._pendingSidecarTexts.update((prev) => prev.filter((st) => st !== sidecarText));
            this.loadedSidecarTexts.update((prev) => [...prev, sidecarText as LoadedSidecarText]);

            if (sidecarText.label === '') {
              this.noUserLabelSidecarTextIds.update((prev) => [...prev, track.id]);
            }

            sidecarText.id = track.id;
            if (showSuccessToast) {
              this.createSuccessToast();
            }

            result$.next(true);
            result$.complete();
          } else {
            this.removeSidecarText(sidecarText);
            this.createErrorToast();

            result$.next(false);
            result$.complete();
          }
        },
        error: () => {
          this.removeSidecarText(sidecarText);
          this.createErrorToast();
        },
      });

    return result$;
  }

  /**
   * Reloads all sidecar texts. Since this method is usually called after Omakase player is recrated the argument
   * should capture the player state before recreation
   *
   * @param {SidecarText[]} sidecarTexts
   */
  public reloadAllSidecarTexts(sidecarTexts: SidecarText[]) {
    sidecarTexts
      .filter((sidecarText) => sidecarText.id)
      .forEach((sidecarText) => {
        this.playerService
          .omakasePlayer!.subtitles.createVttTrack({
            src: sidecarText.src,
            id: sidecarText.id ?? crypto.randomUUID(),
            default: false,
            label: sidecarText.label ?? '',
            language: '',
          })
          .subscribe({
            next: (track) => {
              if (track) {
                this.playerService.omakasePlayer!.subtitles.showTrack(track.id);
                sidecarText.id = track.id;
              } else {
                this.removeSidecarText(sidecarText);
                this.createErrorToast();
              }
            },
            error: () => {
              this.createErrorToast();
              this.removeSidecarText(sidecarText);
            },
          });
      });
  }

  /**
   * Removes the sidecar text from OPCD session
   *
   * @param {SidecarText} sidecarText
   */
  public removeSidecarText(sidecarText: SidecarText) {
    if (sidecarText.id) {
      this.playerService.omakasePlayer!.subtitles.removeTrack(sidecarText.id);
      this.loadedSidecarTexts.update((prev) => prev.filter((st) => st !== sidecarText));

      const subtitleTracks = this.playerService.omakasePlayer!.subtitles.getTracks();
      if (subtitleTracks.length > 0) {
        this.playerService.omakasePlayer?.subtitles.showTrack(subtitleTracks.at(-1)!.id);
      }
    }

    this._pendingSidecarTexts.update((prev) => prev.filter((sidecar) => sidecar !== sidecarText));
  }

  /**
   * Remove all sidecar texts from OPCD session
   */
  public removeAllSidecarTexts() {
    this.loadedSidecarTexts().forEach((track) => this.playerService.omakasePlayer!.subtitles.removeTrack(track.id!));
    this.loadedSidecarTexts.set([]);
  }

  private createSuccessToast() {
    this.toastService.show({message: 'Sidecar successfully loaded', type: 'success', duration: 5000});
  }

  private createErrorToast() {
    this.toastService.show({message: 'Sidecar load failed', type: 'error', duration: 5000});
  }
}

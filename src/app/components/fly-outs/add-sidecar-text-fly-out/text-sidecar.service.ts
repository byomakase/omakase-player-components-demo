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

export type SidecarText = Partial<SubtitlesVttTrack> & {src: string};

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

  public loadedSidecarTexts = signal<SidecarText[]>([]);
  private _pendingSidecarTexts = signal<SidecarText[]>([]);
  public noUserLabelSidecarTextIds = signal<string[]>([]); // sidecar audio ids for which the user did not provide labels

  public sidecarTexts = computed(() => {
    return [...this.loadedSidecarTexts(), ...this._pendingSidecarTexts()];
  });

  public addSidecarText(sidecarText: SidecarText) {
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
            this._pendingSidecarTexts.update((prev) => prev.filter((st) => st !== sidecarText));
            this.loadedSidecarTexts.update((prev) => [...prev, sidecarText]);

            if (sidecarText.label === '') {
              this.noUserLabelSidecarTextIds.update((prev) => [...prev, track.id]);
            }

            sidecarText.id = track.id;
            this.createSuccessToast();
          } else {
            this.removeSidecarText(sidecarText);
            this.createErrorToast();
          }
        },
        error: () => {
          this.removeSidecarText(sidecarText);
          this.createErrorToast();
        },
      });
  }

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

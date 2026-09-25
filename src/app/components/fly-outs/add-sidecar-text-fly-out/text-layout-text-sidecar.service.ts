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
import {forkJoin, of, Subject, switchMap} from 'rxjs';
import {AbstractSidecarTextService} from './text-sidecar.service.abstract';
import {LoadedSidecarText, SidecarText} from './text-sidecar.service';
import {FileFormat, RelationType, TextTrackFile, TimeReference, TrackType, UrlSource} from '@byomakase/omakase-player';
import {ProbingUtil} from '../../../common/util/probing-util';

@Injectable({
  providedIn: 'root',
})
export class TextLayoutSidecarTextService extends AbstractSidecarTextService {
  private playerService = inject(PlayerService);
  private toastService = inject(ToastService);
  constructor() {
    super();
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

    ProbingUtil.resolveFileFormat(this.playerService.omakasePlayer!, sidecarText.src)
      .pipe(
        switchMap((fileFormat) => {
          if (fileFormat === FileFormat.VTT) {
            const omakasePlayer = this.playerService.omakasePlayer!;
            return this.prepareTextTrackSource(sidecarText, omakasePlayer).pipe(
              switchMap((source) =>
                omakasePlayer.player.loadSidecarTrack(source, {
                  trackType: TrackType.TEXT_TRACK,
                  handlerType: sidecarText.engine,
                  args: {
                    label: sidecarText.label !== '' ? sidecarText.label : undefined,
                  },
                  // Slew (and any FFOM offset) is already baked into the source, so load self-referenced.
                  timeReference: TimeReference.SELF,
                  adaptiveRendering: true,
                })
              )
            );
          } else {
            this.createFormatNotSupportedToast();
            const track = new TextTrackFile({
              source: UrlSource.of(sidecarText.src),
              label: sidecarText.label !== '' ? sidecarText.label : undefined,
              sourceFileFormatType: fileFormat?.type,
            });
            this.playerService.omakasePlayer!.track.add(track);
            return of(track);
          }
        })
      )
      .subscribe({
        next: (track) => {
          if (track) {
            if (this.playerService.omakasePlayer?.player.text.getTracks().find((loadedTrack) => loadedTrack.id === track.id)) {
              this.playerService.omakasePlayer!.player.text.switchTrack(track.id);
              if (showSuccessToast) {
                this.createSuccessToast();
              }
            }
            sidecarText.id = track.id;

            this._pendingSidecarTexts.update((prev) => prev.filter((st) => st !== sidecarText));
            this.loadedSidecarTexts.update((prev) => [...prev, sidecarText as LoadedSidecarText]);

            if (sidecarText.label === '') {
              this.noUserLabelSidecarTextIds.update((prev) => [...prev, track.id]);
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
        error: (e) => {
          this.removeSidecarText(sidecarText);
          console.error(e);
          this.createErrorToast();
        },
      });

    return result$;
    return of(true);
  }

  /**
   * Removes the sidecar text from OPCD session
   *
   * @param {SidecarText} sidecarText
   */
  public removeSidecarText(sidecarText: SidecarText) {
    if (sidecarText.id) {
      const originalTextTrack = this.playerService.omakasePlayer!.track.get(sidecarText.id)!;

      const loadedRelatedTracks = this.playerService
        .omakasePlayer!.player.text.getTracks()
        .filter((track) => track.relations?.some((r) => r.relationType === RelationType.DERIVED_FROM && r.entityId === originalTextTrack.id));

      const isOriginalInPlayer = this.playerService.omakasePlayer!.player.text.state.tracks.SIDECAR.find((t) => t.trackId === originalTextTrack.id);
      if (isOriginalInPlayer) {
        this.playerService.omakasePlayer!.player.removeSidecarTrack(originalTextTrack.id).subscribe(() => {
          this.playerService.omakasePlayer!.track.delete(originalTextTrack.id);
        });
      } else {
        this.playerService.omakasePlayer!.track.delete(originalTextTrack.id);
      }

      const deletes$ = loadedRelatedTracks?.map((track) => {
        return this.playerService.omakasePlayer!.player.removeSidecarTrack(track.id);
      });

      forkJoin(deletes$).subscribe(() => {
        this.playerService
          .omakasePlayer!.track.find((track) => track.relations?.some((r) => r.relationType === RelationType.DERIVED_FROM && r.entityId === originalTextTrack.id))
          .forEach((track) => {
            this.playerService.omakasePlayer!.track.delete(track.id);
          });
      });

      this.loadedSidecarTexts.update((prev) => prev.filter((st) => st !== sidecarText));
      // const subtitleTracks = this.playerService.omakasePlayer!.subtitles.getTracks();
      // if (subtitleTracks.length > 0) {
      //   this.playerService.omakasePlayer?.subtitles.showTrack(subtitleTracks.at(-1)!.id);
      // }
    }
    this._pendingSidecarTexts.update((prev) => prev.filter((sidecar) => sidecar !== sidecarText));
  }

  public override reset(): void {
    this.loadedSidecarTexts.set([]);
    this._pendingSidecarTexts.set([]);
  }

  private createSuccessToast() {
    this.toastService.show({message: 'Sidecar successfully loaded', type: 'success', duration: 5000});
  }

  private createErrorToast() {
    this.toastService.show({message: 'Sidecar load failed', type: 'error', duration: 5000});
  }

  private createFormatNotSupportedToast() {
    this.toastService.show({message: 'Sidecar not supported in the current layout', type: 'warning', duration: 5000});
  }
}

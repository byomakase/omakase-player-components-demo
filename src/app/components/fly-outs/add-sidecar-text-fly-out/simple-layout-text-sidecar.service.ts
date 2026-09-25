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
import {of, Subject, switchMap} from 'rxjs';
import {AbstractSidecarTextService} from './text-sidecar.service.abstract';
import {LoadedSidecarText, SidecarText} from './text-sidecar.service';
import {TextTrackArgs, TimeReference, TrackType} from '@byomakase/omakase-player';
import {LayoutService} from '../../layout-menu/layout.service';
import {Layout} from '../../../model/session.model';

@Injectable({
  providedIn: 'root',
})
export class SimpleLayoutSidecarTextService extends AbstractSidecarTextService {
  private playerService = inject(PlayerService);
  private toastService = inject(ToastService);
  private layoutService = inject(LayoutService);

  private readonly noAdaptiveRenderingLayouts: ReadonlySet<Layout> = new Set<Layout>(['hybrid']);

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
    const trackArgs = this.buildTextTrackArgs(sidecarText);

    this.prepareTextTrackSource(sidecarText, this.playerService.omakasePlayer!)
      .pipe(
        switchMap((source) =>
          this.playerService.omakasePlayer!.player.loadSidecarTrack(source, {
            trackType: TrackType.TEXT_TRACK,
            handlerType: sidecarText.engine,
            args: trackArgs,
            // Slew (and any FFOM offset) is already baked into the source, so load self-referenced.
            timeReference: TimeReference.SELF,
            adaptiveRendering: !this.noAdaptiveRenderingLayouts.has(this.layoutService.layout),
          })
        )
      )
      .subscribe({
        next: (track) => {
          if (track) {
            this.playerService.omakasePlayer!.player.text.switchTrack(track.id);
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
   * Builds the track args shared between the text track conversion and the sidecar load.
   *
   * @param {SidecarText} sidecarText
   */
  private buildTextTrackArgs(sidecarText: SidecarText): TextTrackArgs {
    return {
      label: sidecarText.label !== '' ? sidecarText.label : undefined,
    };
  }

  /**
   * Removes the sidecar text from OPCD session
   *
   * @param {SidecarText} sidecarText
   */
  public removeSidecarText(sidecarText: SidecarText) {
    if (sidecarText.id) {
      this.playerService.omakasePlayer!.player.removeSidecarTrack(sidecarText.id);
      this.loadedSidecarTexts.update((prev) => prev.filter((st) => st !== sidecarText));
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
}

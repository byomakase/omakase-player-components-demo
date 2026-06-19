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
import {ToastService} from '../../../common/toast/toast.service';
import {PlayerService} from '../../player/player.service';
import {MarkerStyle, MarkerTrack as OmakaseMarkerTrack, MarkerTrackStyle, TrackSource, TrackType, UrlSource} from '@byomakase/omakase-player';
import {Subject} from 'rxjs';
import {ColorService} from '../../../common/services/color.service';

export interface SidecarMarkerTrack {
  id?: string | undefined;
  src: string;
  label?: string;
  color: string;
  readOnly: boolean;
}

/**
 * Service that manages marker track lifecycle in OPCD session
 */
@Injectable({
  providedIn: 'root',
})
export class MarkerTrackService {
  private playerService = inject(PlayerService);
  private toastService = inject(ToastService);
  private colorService = inject(ColorService);
  public activeMarkerTrack = signal<SidecarMarkerTrack | undefined>(undefined);

  public loadedMarkerTracks = signal<SidecarMarkerTrack[]>([]);

  public markerTracks = computed(() => [...this.loadedMarkerTracks(), ...this._pendingMarkerTracks()]);

  private _pendingMarkerTracks = signal<SidecarMarkerTrack[]>([]);

  public COLORS = ['multicolor', '#CE9DD6', '#9DADD6', '#62C0A4', '#E5EAA2', '#FFBB79', '#F57F65', '#D69D9D', '#E335FF', '#316BFF', '#15EBAB', '#EEFF2F', '#FF8E21', '#FF3306'];
  public HEX_COLORS = ['#CE9DD6', '#9DADD6', '#62C0A4', '#E5EAA2', '#FFBB79', '#F57F65', '#D69D9D', '#E335FF', '#316BFF', '#15EBAB', '#EEFF2F', '#FF8E21', '#FF3306'];
  public MULTICOLOR_COLORS = ['#CE9DD6', '#9DADD6', '#62C0A4', '#E5EAA2'];

  constructor() {}

  /**
   * Registers a marker track to OPCD session
   *
   * @param {SidecarMarkerTrack} markerTrack
   */
  public addMarkerTrack(markerTrack: SidecarMarkerTrack, showSuccessToast: boolean = true) {
    const result$ = new Subject<boolean>();
    this._pendingMarkerTracks.update((prev) => [...prev, markerTrack]);

    const colorResolver = this.colorService.createColorResolver(crypto.randomUUID(), this.HEX_COLORS);

    const track = this.playerService.omakasePlayer!.track.add(
      new OmakaseMarkerTrack({
        source: UrlSource.of(markerTrack.src),
        timedItemsLocked: markerTrack.readOnly,
        timedItemHooks: {
          beforeCreate: (timedItem) => {
            const color = markerTrack.color !== 'multicolor' ? markerTrack.color : colorResolver.getColor(true);

            this.playerService.omakasePlayer!.ui.updateStyleRule<MarkerStyle>({
              id: timedItem.id,
              style: {markerColor: color},
            });
          },
        },
      })
    );

    this.playerService.omakasePlayer!.track.load(TrackSource.fromTrack(track), {trackType: TrackType.MARKER_TRACK}).subscribe({
      next: (trackState) => {
        this._pendingMarkerTracks.update((prev) => prev.filter((t) => t !== markerTrack));
        markerTrack.id = trackState.id;
        this.playerService.omakasePlayer!.ui.updateStyleRule<MarkerTrackStyle>({
          id: trackState.id,
          style: {momentToSpanningThreshold: 1},
        });
        this.loadedMarkerTracks.update((prev) => [...prev, markerTrack]);
        this.activeMarkerTrack.set(markerTrack);

        if (showSuccessToast) {
          this.createSuccessToast();
        }

        result$.next(true);
        result$.complete();
      },
      error: () => {
        if (showSuccessToast) {
          this.createErrorToast();
        }

        result$.next(false);
        result$.complete();
      },
    });
  }

  /**
   * Removes a marker track from OPCD session
   *
   * @param {SidecarMarkerTrack} markerTrack
   */
  public removeMarkerTrack(markerTrack: SidecarMarkerTrack) {
    this.loadedMarkerTracks.update((prev) => prev.filter((track) => track !== markerTrack));
    if (markerTrack.id) {
      this.playerService.omakasePlayer?.track.delete(markerTrack.id);
    }

    if (markerTrack === this.activeMarkerTrack()) {
      if (this.markerTracks().length > 0) {
        this.activeMarkerTrack.set(this.markerTracks().at(0));
      } else {
        this.activeMarkerTrack.set(undefined);
      }
    }
  }

  public removeAllMarkerTracks() {
    this.loadedMarkerTracks().forEach((track) => {
      track.id && this.playerService.omakasePlayer?.track.delete(track.id);
    });
    this.loadedMarkerTracks.set([]);
    this.activeMarkerTrack.set(undefined);
  }

  private createSuccessToast() {
    this.toastService.show({message: 'Marker track successfully loaded', type: 'success', duration: 5000});
  }

  private createErrorToast() {
    this.toastService.show({message: 'Marker track load failed', type: 'error', duration: 5000});
  }
}

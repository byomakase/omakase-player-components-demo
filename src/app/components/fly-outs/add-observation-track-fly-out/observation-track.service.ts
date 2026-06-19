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
import {ObservationTrack, TrackType} from '@byomakase/omakase-player';

export interface SidecarObservationTrack {
  id: string;
  src: string;
  label?: string;
  visualization: ObservationTrackVisualization;
  color: string;
  minValue?: number;
  maxValue?: number;
}

export type ObservationTrackVisualization = 'line-chart' | 'bar-chart' | 'led-chart';

/**
 * Service that manages observation track lifecycle in OPCD session
 */
@Injectable({
  providedIn: 'root',
})
export class ObservationTrackService {
  private playerService = inject(PlayerService);
  private toastService = inject(ToastService);

  public loadedObservationTracks = signal<SidecarObservationTrack[]>([]);

  public observationTracks = computed(() => [...this.loadedObservationTracks(), ...this._pendingObservationTracks()]);

  private _pendingObservationTracks = signal<SidecarObservationTrack[]>([]);

  public COLORS = ['#CE9DD6', '#9DADD6', '#62C0A4', '#E5EAA2', '#FFBB79', '#F57F65', '#D69D9D', '#E335FF', '#316BFF', '#15EBAB', '#EEFF2F', '#FF8E21', '#FF3306', '#FF7272'];

  constructor() {}

  /**
   * Registers an observation track to OPCD session and loads it through the player.
   * The track is moved from pending to loaded once the load resolves.
   */
  public addObservationTrack(observationTrack: SidecarObservationTrack, showSuccessToast: boolean = true) {
    this._pendingObservationTracks.update((prev) => [...prev, observationTrack]);

    this.playerService
      .omakasePlayer!.track.load(observationTrack.src, {
        trackType: TrackType.OBSERVATION_TRACK,
        args: {label: observationTrack.label},
      })
      .subscribe({
        next: (trackState) => {
          this._pendingObservationTracks.update((prev) => prev.filter((t) => t !== observationTrack));
          observationTrack.id = trackState.id;

          // Fill in Y-axis bounds from the loaded data when the user didn't supply them in the flyout.
          if (observationTrack.minValue === undefined || observationTrack.maxValue === undefined) {
            const derived = this.deriveValueRange(trackState as ObservationTrack);
            if (derived) {
              observationTrack.minValue = observationTrack.minValue ?? derived.min;
              observationTrack.maxValue = observationTrack.maxValue ?? derived.max;
            }
          }

          this.loadedObservationTracks.update((prev) => [...prev, observationTrack]);

          if (showSuccessToast) {
            this.createSuccessToast();
          }
        },
        error: () => {
          this._pendingObservationTracks.update((prev) => prev.filter((t) => t !== observationTrack));
          this.createErrorToast();
        },
      });
  }

  /**
   * Removes an observation track from OPCD session.
   */
  public removeObservationTrack(observationTrack: SidecarObservationTrack) {
    this.loadedObservationTracks.update((prev) => prev.filter((t) => t !== observationTrack));
    if (observationTrack.id) {
      this.playerService.omakasePlayer!.track.delete(observationTrack.id);
    }
  }

  public removeAllObservationTracks() {
    this.loadedObservationTracks().forEach((t) => {
      if (t.id) {
        this.playerService.omakasePlayer?.track.delete(t.id);
      }
    });
    this.loadedObservationTracks.set([]);
  }

  private deriveValueRange(track: ObservationTrack): {min: number; max: number} | undefined {
    let min = Infinity;
    let max = -Infinity;
    track.timedItemsSorted.forEach((obs) => {
      obs.items.forEach((item) => {
        if (item.value === undefined) return;
        const v = parseFloat(item.value);
        if (isNaN(v)) return;
        if (v < min) min = v;
        if (v > max) max = v;
      });
    });
    if (!isFinite(min) || !isFinite(max) || min === max) {
      return undefined;
    }
    return {min, max};
  }

  private createSuccessToast() {
    this.toastService.show({message: 'Observation track successfully loaded', type: 'success', duration: 5000});
  }

  private createErrorToast() {
    this.toastService.show({message: 'Observation track load failed', type: 'error', duration: 5000});
  }
}
